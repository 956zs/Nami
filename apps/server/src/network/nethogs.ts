import { spawn, type ChildProcess } from "child_process";
import { readFileSync } from "fs";
import { EventEmitter } from "events";

export interface ProcessBandwidth {
    pid: number;
    name: string;
    user: string;
    sentKBs: number;
    receivedKBs: number;
}

// Cache for process names
const processNameCache = new Map<number, string>();

function getProcessName(pid: number): string {
    if (processNameCache.has(pid)) {
        return processNameCache.get(pid)!;
    }

    try {
        const name = readFileSync(`/proc/${pid}/comm`, "utf-8").trim();
        processNameCache.set(pid, name);
        return name;
    } catch {
        return `pid-${pid}`;
    }
}

export class NethogsMonitor extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning = false;
    private data: Map<number, ProcessBandwidth> = new Map();

    static isAvailable(): boolean {
        try {
            const { execSync } = require("child_process");
            execSync("which nethogs", { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }

    static isRoot(): boolean {
        return process.getuid?.() === 0;
    }

    start(): boolean {
        if (this.isRunning) return true;

        if (!NethogsMonitor.isRoot()) {
            console.log("[nethogs] Requires root - bandwidth disabled");
            return false;
        }

        if (!NethogsMonitor.isAvailable()) {
            console.log("[nethogs] Not installed - bandwidth disabled");
            return false;
        }

        try {
            // -t: tracemode, -v 0: KB/s, -C: TCP+UDP
            const args = ["-t", "-v", "0", "-C", "-d", "1"];

            this.process = spawn("nethogs", args, {
                stdio: ["ignore", "pipe", "pipe"],
            });

            this.isRunning = true;
            console.log("[nethogs] Started");

            let buffer = "";
            this.process.stdout?.on("data", (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    this.parseLine(line.trim());
                }
            });

            this.process.stderr?.on("data", (chunk: Buffer) => {
                const msg = chunk.toString().trim();
                if (msg && !msg.includes("Waiting") && !msg.includes("Adding") && !msg.includes("link") && !msg.includes("Ethernet")) {
                    console.error("[nethogs]", msg);
                }
            });

            this.process.on("error", (err) => {
                console.error("[nethogs] Error:", err.message);
                this.isRunning = false;
            });

            this.process.on("exit", (code) => {
                if (code !== 0 && code !== null) {
                    console.log(`[nethogs] Exit code ${code}`);
                }
                this.isRunning = false;
                this.process = null;
            });

            return true;
        } catch (err) {
            console.error("[nethogs] Failed:", err);
            return false;
        }
    }

    /**
     * Parse nethogs output
     * Format: /path/program/PID/UID  sent  recv
     * Examples:
     *   /opt/google/chrome/chrome/171599/1000	538.493	18.39
     *   /proc/self/exe/436574/1000	0.07	0.55
     */
    private parseLine(line: string): void {
        if (!line || line.startsWith("Refreshing") || line === "") return;

        const parts = line.split(/\s+/);
        if (parts.length < 3) return;

        try {
            const programPart = parts[0];
            const sent = parseFloat(parts[1]) || 0;
            const recv = parseFloat(parts[2]) || 0;

            if (programPart.startsWith("unknown")) return;
            if (sent === 0 && recv === 0) return;

            // Parse: /path/program/PID/UID
            const segments = programPart.split("/");
            if (segments.length < 3) return;

            const uid = segments.pop() || "0";
            const pidStr = segments.pop() || "0";
            const pid = parseInt(pidStr, 10);

            if (isNaN(pid) || pid <= 0) return;

            // Get actual process name from /proc/{pid}/comm
            // This avoids issues with "/proc/self/exe" showing as "self"
            const name = getProcessName(pid);

            this.data.set(pid, {
                pid,
                name,
                user: uid,
                sentKBs: sent,
                receivedKBs: recv,
            });
        } catch {
            // Ignore
        }
    }

    getData(): ProcessBandwidth[] {
        // Clean up dead processes
        for (const [pid] of this.data) {
            try {
                readFileSync(`/proc/${pid}/comm`);
            } catch {
                this.data.delete(pid);
                processNameCache.delete(pid);
            }
        }

        return Array.from(this.data.values())
            .filter(p => p.sentKBs > 0 || p.receivedKBs > 0)
            .sort((a, b) => (b.sentKBs + b.receivedKBs) - (a.sentKBs + a.receivedKBs));
    }

    getTop(n: number = 5): ProcessBandwidth[] {
        return this.getData().slice(0, n);
    }

    /**
     * Active cleanup of stale data - call this periodically
     * Enforces maximum cache size to prevent memory leaks
     */
    cleanupStaleData(): { processesRemoved: number; cacheEntriesRemoved: number } {
        let processesRemoved = 0;
        let cacheEntriesRemoved = 0;

        // Clean up data for dead processes
        for (const [pid] of this.data) {
            try {
                readFileSync(`/proc/${pid}/comm`);
            } catch {
                this.data.delete(pid);
                processesRemoved++;
            }
        }

        // Cleanup processNameCache - remove entries for dead processes
        // Also enforce max cache size of 500 entries
        const MAX_CACHE_SIZE = 500;

        for (const [pid] of processNameCache) {
            try {
                readFileSync(`/proc/${pid}/comm`);
            } catch {
                processNameCache.delete(pid);
                cacheEntriesRemoved++;
            }
        }

        // If still too large, remove oldest entries (first in map)
        if (processNameCache.size > MAX_CACHE_SIZE) {
            const toDelete = processNameCache.size - MAX_CACHE_SIZE;
            let deleted = 0;
            for (const [pid] of processNameCache) {
                if (deleted >= toDelete) break;
                processNameCache.delete(pid);
                deleted++;
                cacheEntriesRemoved++;
            }
        }

        return { processesRemoved, cacheEntriesRemoved };
    }

    stop(): void {
        if (this.process) {
            this.process.kill("SIGTERM");
            this.process = null;
        }
        this.isRunning = false;
        this.data.clear();
        processNameCache.clear();
        console.log("[nethogs] Stopped");
    }

    isActive(): boolean {
        return this.isRunning;
    }
}

export const nethogsMonitor = new NethogsMonitor();

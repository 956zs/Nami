import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";

/**
 * Per-process bandwidth data from nethogs
 */
export interface ProcessBandwidth {
    pid: number;
    name: string;
    cmdline: string;
    device: string;
    sentKBs: number;      // KB/s
    receivedKBs: number;  // KB/s
    sentTotal: number;    // Total KB
    receivedTotal: number; // Total KB
}

/**
 * Nethogs process manager - spawns nethogs and parses its output
 */
export class NethogsMonitor extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning = false;
    private data: Map<number, ProcessBandwidth> = new Map();
    private checkInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Check if nethogs is available
     */
    static isAvailable(): boolean {
        try {
            const { execSync } = require("child_process");
            execSync("which nethogs", { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if running as root (required for nethogs)
     */
    static isRoot(): boolean {
        return process.getuid?.() === 0;
    }

    /**
     * Start nethogs monitoring
     */
    start(devices: string[] = []): boolean {
        if (this.isRunning) {
            console.log("⚠️ Nethogs already running");
            return true;
        }

        if (!NethogsMonitor.isRoot()) {
            console.log("⚠️ Nethogs requires root privileges - bandwidth monitoring disabled");
            return false;
        }

        if (!NethogsMonitor.isAvailable()) {
            console.log("⚠️ Nethogs not installed - bandwidth monitoring disabled");
            return false;
        }

        try {
            // -t: tracemode (machine readable)
            // -v 0: KB/s mode
            // -C: capture TCP and UDP
            // -b: short program name
            const args = ["-t", "-v", "0", "-C", "-b", "-d", "1"];
            if (devices.length > 0) {
                args.push(...devices);
            }

            this.process = spawn("nethogs", args, {
                stdio: ["ignore", "pipe", "pipe"],
            });

            this.isRunning = true;
            console.log("📊 Nethogs bandwidth monitoring started");

            // Parse stdout line by line
            let buffer = "";
            this.process.stdout?.on("data", (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    this.parseLine(line);
                }
            });

            this.process.stderr?.on("data", (chunk: Buffer) => {
                const msg = chunk.toString().trim();
                if (msg && !msg.includes("Waiting")) {
                    console.error("nethogs stderr:", msg);
                }
            });

            this.process.on("error", (err) => {
                console.error("Nethogs error:", err.message);
                this.isRunning = false;
            });

            this.process.on("exit", (code) => {
                console.log(`Nethogs exited with code ${code}`);
                this.isRunning = false;
                this.process = null;
            });

            return true;
        } catch (err) {
            console.error("Failed to start nethogs:", err);
            return false;
        }
    }

    /**
     * Parse a line from nethogs tracemode output
     * Format: program/PID/user<TAB>device<TAB>sent<TAB>received
     */
    private parseLine(line: string): void {
        if (!line.trim() || line.startsWith("Refresh")) return;

        const parts = line.split("\t");
        if (parts.length < 4) return;

        try {
            // Parse program/PID/user format
            const [programPart, device, sentStr, recvStr] = parts;

            // Extract program name and PID
            // Format: /usr/bin/program/12345/user or program/12345/user
            const segments = programPart.split("/");
            if (segments.length < 3) return;

            // PID is second to last, user is last
            const pidStr = segments[segments.length - 2];
            const pid = parseInt(pidStr, 10);
            if (isNaN(pid) || pid <= 0) return;

            // Program name is everything before the PID
            const nameSegments = segments.slice(0, -2);
            const name = nameSegments.length > 0
                ? nameSegments[nameSegments.length - 1] || nameSegments.join("/")
                : "unknown";

            const sent = parseFloat(sentStr) || 0;
            const recv = parseFloat(recvStr) || 0;

            // Get existing data to accumulate totals
            const existing = this.data.get(pid);

            this.data.set(pid, {
                pid,
                name,
                cmdline: programPart,
                device: device || "?",
                sentKBs: sent,
                receivedKBs: recv,
                sentTotal: (existing?.sentTotal || 0) + sent,
                receivedTotal: (existing?.receivedTotal || 0) + recv,
            });

            this.emit("data", this.data.get(pid));
        } catch {
            // Ignore parse errors
        }
    }

    /**
     * Get current bandwidth data for all processes
     */
    getData(): ProcessBandwidth[] {
        return Array.from(this.data.values())
            .filter(p => p.sentKBs > 0 || p.receivedKBs > 0)
            .sort((a, b) => (b.sentKBs + b.receivedKBs) - (a.sentKBs + a.receivedKBs));
    }

    /**
     * Get top N processes by bandwidth
     */
    getTop(n: number = 5): ProcessBandwidth[] {
        return this.getData().slice(0, n);
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.process) {
            this.process.kill("SIGTERM");
            this.process = null;
        }
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        this.data.clear();
        console.log("📊 Nethogs monitoring stopped");
    }

    /**
     * Check if monitoring is active
     */
    isActive(): boolean {
        return this.isRunning;
    }
}

// Singleton instance
export const nethogsMonitor = new NethogsMonitor();

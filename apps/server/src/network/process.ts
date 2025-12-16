import { readFileSync, readdirSync, readlinkSync, existsSync } from "fs";

/**
 * Process network information
 */
export interface ProcessNetInfo {
    pid: number;
    name: string;
    cmdline: string;
    connections: {
        tcp: number;
        udp: number;
        total: number;
    };
    sockets: SocketInfo[];
}

export interface SocketInfo {
    protocol: "tcp" | "udp";
    localAddr: string;
    localPort: number;
    remoteAddr: string;
    remotePort: number;
    state: string;
}

// TCP state mapping
const TCP_STATES: Record<string, string> = {
    "01": "ESTABLISHED",
    "02": "SYN_SENT",
    "03": "SYN_RECV",
    "04": "FIN_WAIT1",
    "05": "FIN_WAIT2",
    "06": "TIME_WAIT",
    "07": "CLOSE",
    "08": "CLOSE_WAIT",
    "09": "LAST_ACK",
    "0A": "LISTEN",
    "0B": "CLOSING",
};

/**
 * Parse hex IP address from /proc/net/tcp format
 */
function parseHexIp(hex: string): string {
    // Linux stores IP in little-endian hex
    const parts = [];
    for (let i = hex.length - 2; i >= 0; i -= 2) {
        parts.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return parts.join(".");
}

/**
 * Parse a line from /proc/net/tcp or /proc/net/udp
 */
function parseNetLine(line: string, protocol: "tcp" | "udp"): { inode: string; socket: SocketInfo } | null {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) return null;

    try {
        const localAddrPort = parts[1].split(":");
        const remoteAddrPort = parts[2].split(":");
        const state = parts[3];
        const inode = parts[9];

        return {
            inode,
            socket: {
                protocol,
                localAddr: parseHexIp(localAddrPort[0]),
                localPort: parseInt(localAddrPort[1], 16),
                remoteAddr: parseHexIp(remoteAddrPort[0]),
                remotePort: parseInt(remoteAddrPort[1], 16),
                state: protocol === "tcp" ? (TCP_STATES[state] || state) : "STATELESS",
            },
        };
    } catch {
        return null;
    }
}

/**
 * Read all sockets from /proc/net/tcp and /proc/net/udp
 */
function readAllSockets(): Map<string, SocketInfo> {
    const sockets = new Map<string, SocketInfo>();

    // Read TCP sockets
    try {
        const tcpContent = readFileSync("/proc/net/tcp", "utf-8");
        const tcpLines = tcpContent.split("\n").slice(1); // skip header
        for (const line of tcpLines) {
            const result = parseNetLine(line, "tcp");
            if (result && result.inode !== "0") {
                sockets.set(result.inode, result.socket);
            }
        }
    } catch (e) {
        console.error("Failed to read /proc/net/tcp:", e);
    }

    // Read UDP sockets
    try {
        const udpContent = readFileSync("/proc/net/udp", "utf-8");
        const udpLines = udpContent.split("\n").slice(1);
        for (const line of udpLines) {
            const result = parseNetLine(line, "udp");
            if (result && result.inode !== "0") {
                sockets.set(result.inode, result.socket);
            }
        }
    } catch (e) {
        console.error("Failed to read /proc/net/udp:", e);
    }

    return sockets;
}

/**
 * Get process name from /proc/{pid}/comm
 */
function getProcessName(pid: number): string {
    try {
        return readFileSync(`/proc/${pid}/comm`, "utf-8").trim();
    } catch {
        return "unknown";
    }
}

/**
 * Get process command line from /proc/{pid}/cmdline
 */
function getProcessCmdline(pid: number): string {
    try {
        const cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf-8");
        return cmdline.replace(/\0/g, " ").trim() || getProcessName(pid);
    } catch {
        return getProcessName(pid);
    }
}

/**
 * Find which socket inodes belong to which process
 */
function mapSocketsToProcesses(sockets: Map<string, SocketInfo>): Map<number, ProcessNetInfo> {
    const processes = new Map<number, ProcessNetInfo>();
    const socketInodes = new Set(sockets.keys());

    try {
        const procDirs = readdirSync("/proc").filter((d) => /^\d+$/.test(d));

        for (const pidStr of procDirs) {
            const pid = parseInt(pidStr, 10);
            const fdPath = `/proc/${pid}/fd`;

            if (!existsSync(fdPath)) continue;

            try {
                const fds = readdirSync(fdPath);
                const processSockets: SocketInfo[] = [];

                for (const fd of fds) {
                    try {
                        const link = readlinkSync(`${fdPath}/${fd}`);
                        // Socket links look like: socket:[12345]
                        const match = link.match(/^socket:\[(\d+)\]$/);
                        if (match) {
                            const inode = match[1];
                            if (socketInodes.has(inode)) {
                                const socket = sockets.get(inode);
                                if (socket) {
                                    processSockets.push(socket);
                                }
                            }
                        }
                    } catch {
                        // Permission denied or fd no longer exists
                    }
                }

                if (processSockets.length > 0) {
                    const tcpCount = processSockets.filter((s) => s.protocol === "tcp").length;
                    const udpCount = processSockets.filter((s) => s.protocol === "udp").length;

                    processes.set(pid, {
                        pid,
                        name: getProcessName(pid),
                        cmdline: getProcessCmdline(pid),
                        connections: {
                            tcp: tcpCount,
                            udp: udpCount,
                            total: tcpCount + udpCount,
                        },
                        sockets: processSockets,
                    });
                }
            } catch {
                // Permission denied for this process
            }
        }
    } catch (e) {
        console.error("Failed to scan /proc:", e);
    }

    return processes;
}

/**
 * Get all processes with network connections
 */
export function getProcessNetworkInfo(): ProcessNetInfo[] {
    const sockets = readAllSockets();
    const processes = mapSocketsToProcesses(sockets);

    // Convert to array and sort by connection count
    return Array.from(processes.values()).sort(
        (a, b) => b.connections.total - a.connections.total
    );
}

/**
 * Get top N processes by connection count
 */
export function getTopProcesses(n: number = 5): ProcessNetInfo[] {
    return getProcessNetworkInfo().slice(0, n);
}

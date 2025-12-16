/**
 * Interface details (cached separately from realtime stats)
 */
export interface InterfaceDetails {
    mac: string;
    mtu: number;
    state: string;
    speed: number | null;
    duplex: string | null;
    ipv4: string[];
    ipv6: string[];
}

/**
 * Network interface statistics
 */
export interface NetworkInterface extends InterfaceDetails {
    name: string;
    category: string;
    rxBytes: number;
    txBytes: number;
    rxSpeed: number;
    txSpeed: number;
}

/**
 * Socket information
 */
export interface SocketInfo {
    protocol: "tcp" | "udp";
    localAddr: string;
    localPort: number;
    remoteAddr: string;
    remotePort: number;
    state: string;
}

/**
 * Process network information (from /proc)
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

/**
 * Per-process bandwidth data (from nethogs)
 */
export interface ProcessBandwidth {
    pid: number;
    name: string;
    cmdline: string;
    device: string;
    sentKBs: number;
    receivedKBs: number;
    sentTotal: number;
    receivedTotal: number;
}

/**
 * WebSocket message payload
 */
export interface NetworkStatsPayload {
    interfaces: NetworkInterface[];
    processes: ProcessNetInfo[];
    topProcesses: ProcessNetInfo[];
    bandwidth: ProcessBandwidth[];
    bandwidthEnabled: boolean;
    timestamp: number;
}

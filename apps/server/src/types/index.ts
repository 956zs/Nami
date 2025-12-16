export interface InterfaceDetails {
    mac: string;
    mtu: number;
    state: string;
    speed: number | null;
    duplex: string | null;
    ipv4: string[];
    ipv6: string[];
}

export interface NetworkInterface extends InterfaceDetails {
    name: string;
    category: string;
    rxBytes: number;
    txBytes: number;
    rxSpeed: number;
    txSpeed: number;
}

export interface SocketInfo {
    protocol: "tcp" | "udp";
    localAddr: string;
    localPort: number;
    remoteAddr: string;
    remotePort: number;
    state: string;
}

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

export interface ProcessBandwidth {
    pid: number;
    name: string;
    user: string;
    sentKBs: number;
    receivedKBs: number;
}

export interface NetworkStatsPayload {
    interfaces: NetworkInterface[];
    processes: ProcessNetInfo[];
    topProcesses: ProcessNetInfo[];
    bandwidth: ProcessBandwidth[];
    bandwidthEnabled: boolean;
    timestamp: number;
}

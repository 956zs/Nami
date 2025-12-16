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

export interface ChartDataPoint {
    time: string;
    timestamp: number;
    rxSpeed: number;
    txSpeed: number;
}

export interface CategoryInfo {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
    ethernet: { id: "ethernet", label: "Ethernet", icon: "🔌", color: "text-blue-400" },
    wireless: { id: "wireless", label: "Wireless", icon: "📶", color: "text-green-400" },
    vpn: { id: "vpn", label: "VPN", icon: "🔐", color: "text-purple-400" },
    docker: { id: "docker", label: "Docker", icon: "🐳", color: "text-cyan-400" },
    bridge: { id: "bridge", label: "Bridge", icon: "🌉", color: "text-orange-400" },
    virtual: { id: "virtual", label: "Virtual", icon: "💻", color: "text-pink-400" },
    loopback: { id: "loopback", label: "Loopback", icon: "🔄", color: "text-gray-400" },
    other: { id: "other", label: "Other", icon: "📡", color: "text-slate-400" },
};

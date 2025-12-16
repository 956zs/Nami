import { useState, useEffect, useRef, useCallback } from "react";
import type { NetworkStatsPayload, NetworkInterface, ProcessNetInfo, ProcessBandwidth } from "@/types";

interface UseNetworkStatsOptions {
    maxDataPoints?: number;
    reconnectInterval?: number;
    updateInterval?: number;
    showLoopback?: boolean;
    showDocker?: boolean;
}

interface UseNetworkStatsReturn {
    interfaces: NetworkInterface[];
    processes: ProcessNetInfo[];
    topProcesses: ProcessNetInfo[];
    bandwidth: ProcessBandwidth[];
    bandwidthEnabled: boolean;
    selectedInterface: string | null;
    setSelectedInterface: (name: string) => void;
    isConnected: boolean;
    error: string | null;
    history: Map<string, NetworkInterface[]>;
    refreshDetails: () => void;
}

export function useNetworkStats(
    options: UseNetworkStatsOptions = {}
): UseNetworkStatsReturn {
    const {
        maxDataPoints = 60,
        reconnectInterval = 3000,
        updateInterval = 1000,
        showLoopback = true,
        showDocker = true,
    } = options;

    const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
    const [processes, setProcesses] = useState<ProcessNetInfo[]>([]);
    const [topProcesses, setTopProcesses] = useState<ProcessNetInfo[]>([]);
    const [bandwidth, setBandwidth] = useState<ProcessBandwidth[]>([]);
    const [bandwidthEnabled, setBandwidthEnabled] = useState(false);
    const [selectedInterface, setSelectedInterface] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<Map<string, NetworkInterface[]>>(new Map());

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const disconnectDebounceRef = useRef<number | null>(null);
    const selectedInterfaceRef = useRef<string | null>(null);
    const isFirstMessageRef = useRef(true);
    const latestDataRef = useRef<NetworkStatsPayload | null>(null);
    const updateIntervalRef = useRef<number | null>(null);
    const connectRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        selectedInterfaceRef.current = selectedInterface;
    }, [selectedInterface]);

    const filterInterfaces = useCallback((ifaces: NetworkInterface[]): NetworkInterface[] => {
        return ifaces.filter((iface) => {
            if (!showLoopback && iface.category === "loopback") return false;
            if (!showDocker && iface.category === "docker") return false;
            return true;
        });
    }, [showLoopback, showDocker]);

    useEffect(() => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
        }

        updateIntervalRef.current = window.setInterval(() => {
            const data = latestDataRef.current;
            if (!data) return;

            const filtered = filterInterfaces(data.interfaces);
            setInterfaces(filtered);
            setProcesses(data.processes || []);
            setTopProcesses(data.topProcesses || []);
            setBandwidth(data.bandwidth || []);
            setBandwidthEnabled(data.bandwidthEnabled || false);

            if (isFirstMessageRef.current && filtered.length > 0) {
                isFirstMessageRef.current = false;
                if (!selectedInterfaceRef.current) {
                    setSelectedInterface(filtered[0].name);
                }
            }

            setHistory((prev) => {
                const newHistory = new Map(prev);
                for (const iface of filtered) {
                    const existing = newHistory.get(iface.name) || [];
                    const updated = [...existing, iface].slice(-maxDataPoints);
                    newHistory.set(iface.name, updated);
                }
                return newHistory;
            });
        }, updateInterval);

        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [maxDataPoints, updateInterval, filterInterfaces]);

    const refreshDetails = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send("refresh");
        }
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        if (disconnectDebounceRef.current) {
            clearTimeout(disconnectDebounceRef.current);
            disconnectDebounceRef.current = null;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (disconnectDebounceRef.current) {
                    clearTimeout(disconnectDebounceRef.current);
                    disconnectDebounceRef.current = null;
                }
                setIsConnected(true);
                setError(null);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "refreshed") return;
                    latestDataRef.current = data as NetworkStatsPayload;
                } catch {
                    // ignore
                }
            };

            ws.onclose = () => {
                disconnectDebounceRef.current = window.setTimeout(() => {
                    setIsConnected(false);
                }, 1500);

                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connectRef.current?.();
                }, reconnectInterval);
            };

            ws.onerror = () => {
                setError("Connection error");
            };
        } catch {
            setError("Failed to connect");
        }
    }, [reconnectInterval]);

    // Update connectRef whenever connect changes
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- WebSocket connection needs to be established on mount
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (disconnectDebounceRef.current) clearTimeout(disconnectDebounceRef.current);
        };
    }, [connect]);

    return {
        interfaces,
        processes,
        topProcesses,
        bandwidth,
        bandwidthEnabled,
        selectedInterface,
        setSelectedInterface,
        isConnected,
        error,
        history,
        refreshDetails,
    };
}

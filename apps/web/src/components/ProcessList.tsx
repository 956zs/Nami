import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { ProcessNetInfo, SocketInfo } from "@/types";
import { cn } from "@/lib/utils";

interface ProcessListProps {
    processes: ProcessNetInfo[];
    compact?: boolean;
}

export const ProcessList = memo(function ProcessList({ processes, compact = false }: ProcessListProps) {
    const [expandedPid, setExpandedPid] = useState<number | null>(null);

    if (processes.length === 0) {
        return (
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="flex items-center justify-center h-[200px] text-slate-500">
                    No processes with network connections found
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>Processes with Network Connections</span>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                        {processes.length} processes
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className={compact ? "h-[200px]" : "h-[400px]"}>
                    <div className="space-y-2 pr-4">
                        {processes.map((proc) => (
                            <ProcessItem
                                key={proc.pid}
                                process={proc}
                                isExpanded={expandedPid === proc.pid}
                                onToggle={() => setExpandedPid(expandedPid === proc.pid ? null : proc.pid)}
                                compact={compact}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
});

interface ProcessItemProps {
    process: ProcessNetInfo;
    isExpanded: boolean;
    onToggle: () => void;
    compact?: boolean;
}

const ProcessItem = memo(function ProcessItem({ process, isExpanded, onToggle, compact }: ProcessItemProps) {
    return (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full text-left p-3 hover:bg-slate-800/70 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">📦</span>
                        <div>
                            <span className="font-medium text-white">{process.name}</span>
                            <span className="text-xs text-slate-500 ml-2">PID: {process.pid}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-600/20 text-cyan-400 border-cyan-600/30">
                            TCP: {process.connections.tcp}
                        </Badge>
                        <Badge className="bg-pink-600/20 text-pink-400 border-pink-600/30">
                            UDP: {process.connections.udp}
                        </Badge>
                        <span className="text-xs text-slate-400">
                            {isExpanded ? "▲" : "▼"}
                        </span>
                    </div>
                </div>
                {!compact && (
                    <p className="text-xs text-slate-500 mt-1 truncate max-w-[400px]">
                        {process.cmdline}
                    </p>
                )}
            </button>

            {isExpanded && process.sockets.length > 0 && (
                <div className="border-t border-slate-700/50 bg-slate-900/50 p-3">
                    <div className="text-xs text-slate-400 mb-2">Connections:</div>
                    <ScrollArea className="max-h-[200px]">
                        <div className="space-y-1">
                            {process.sockets.map((socket, idx) => (
                                <SocketItem key={idx} socket={socket} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
});

function SocketItem({ socket }: { socket: SocketInfo }) {
    return (
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/50 rounded p-2">
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] py-0 px-1",
                    socket.protocol === "tcp" ? "border-cyan-500 text-cyan-400" : "border-pink-500 text-pink-400"
                )}
            >
                {socket.protocol.toUpperCase()}
            </Badge>
            <span className="text-slate-400">
                {socket.localAddr}:{socket.localPort}
            </span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-300">
                {socket.remoteAddr}:{socket.remotePort}
            </span>
            <Badge
                variant="outline"
                className={cn(
                    "ml-auto text-[10px] py-0 px-1",
                    socket.state === "ESTABLISHED" ? "border-green-500 text-green-400" :
                        socket.state === "LISTEN" ? "border-blue-500 text-blue-400" :
                            "border-slate-500 text-slate-400"
                )}
            >
                {socket.state}
            </Badge>
        </div>
    );
}

// Compact version for showing top processes on main page
interface TopProcessesProps {
    processes: ProcessNetInfo[];
}

export const TopProcesses = memo(function TopProcesses({ processes }: TopProcessesProps) {
    if (processes.length === 0) return null;

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                    🔥 Top Network Processes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {processes.slice(0, 5).map((proc, idx) => (
                        <div
                            key={proc.pid}
                            className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                                <span className="text-white font-medium">{proc.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge className="bg-slate-700 text-slate-200 text-xs">
                                    {proc.connections.total} conn
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
});

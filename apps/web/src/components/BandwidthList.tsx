import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkline } from "@/components/Sparkline";
import type { ProcessBandwidth } from "@/types";

interface BandwidthListProps {
    bandwidth: ProcessBandwidth[];
    enabled: boolean;
    bandwidthHistory?: Map<number, { sent: number; received: number }[]>;
}

function formatKBs(kbs: number): string {
    if (kbs < 1) return `${(kbs * 1024).toFixed(0)} B/s`;
    if (kbs < 1024) return `${kbs.toFixed(1)} KB/s`;
    return `${(kbs / 1024).toFixed(2)} MB/s`;
}

export const BandwidthList = memo(function BandwidthList({ bandwidth, enabled, bandwidthHistory }: BandwidthListProps) {
    if (!enabled) {
        return (
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center h-[200px] text-slate-500 gap-2">
                    <span className="text-xl">🔒</span>
                    <span>Bandwidth monitoring requires root</span>
                    <span className="text-xs text-slate-600">Run: sudo ./start.sh → option 2</span>
                </CardContent>
            </Card>
        );
    }

    if (bandwidth.length === 0) {
        return (
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="flex items-center justify-center h-[200px] text-slate-500">
                    Waiting for bandwidth data...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>Per-Process Bandwidth</span>
                    <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                        LIVE
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-4">
                        {bandwidth.map((proc, idx) => {
                            const history = bandwidthHistory?.get(proc.pid) || [];
                            const rxData = history.map(h => h.received);
                            const txData = history.map(h => h.sent);

                            return (
                                <div
                                    key={`${proc.pid}-${idx}`}
                                    className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/40"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{proc.name}</span>
                                            <span className="text-xs text-slate-500">PID: {proc.pid}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="grid grid-cols-2 gap-4 flex-1">
                                            <div className="bg-cyan-950/30 rounded p-2">
                                                <div className="text-xs text-cyan-400 mb-1">Download</div>
                                                <div className="text-lg font-bold text-cyan-300">
                                                    {formatKBs(proc.receivedKBs)}
                                                </div>
                                            </div>
                                            <div className="bg-pink-950/30 rounded p-2">
                                                <div className="text-xs text-pink-400 mb-1">Upload</div>
                                                <div className="text-lg font-bold text-pink-300">
                                                    {formatKBs(proc.sentKBs)}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Sparkline charts in bottom-right */}
                                        <div className="flex flex-col gap-1 ml-3">
                                            <Sparkline data={rxData} color="#06b6d4" width={60} height={18} />
                                            <Sparkline data={txData} color="#ec4899" width={60} height={18} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
});

interface TopBandwidthProps {
    bandwidth: ProcessBandwidth[];
    enabled: boolean;
}

export const TopBandwidth = memo(function TopBandwidth({ bandwidth, enabled }: TopBandwidthProps) {
    if (!enabled || bandwidth.length === 0) return null;

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    Top Bandwidth Usage
                    <Badge className="bg-green-600/20 text-green-400 text-[10px]">LIVE</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {bandwidth.slice(0, 5).map((proc, idx) => (
                        <div
                            key={`${proc.pid}-${idx}`}
                            className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                                <span className="text-white font-medium">{proc.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-cyan-400">↓{formatKBs(proc.receivedKBs)}</span>
                                <span className="text-pink-400">↑{formatKBs(proc.sentKBs)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
});

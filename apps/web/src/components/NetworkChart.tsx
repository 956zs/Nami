import { useMemo } from "react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import type { NetworkInterface } from "@/types";
import { formatSpeed, formatTime, formatBytes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface NetworkChartProps {
    history: NetworkInterface[];
    interfaceName: string;
}

export function NetworkChart({ history, interfaceName }: NetworkChartProps) {
    const chartData = useMemo(() => {
        return history.map((item, index) => ({
            time: formatTime(Date.now() - (history.length - 1 - index) * 1000),
            rxSpeed: item.rxSpeed,
            txSpeed: item.txSpeed,
        }));
    }, [history]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (history.length === 0) return null;

        const rxSpeeds = history.map(h => h.rxSpeed);
        const txSpeeds = history.map(h => h.txSpeed);
        const latest = history[history.length - 1];

        return {
            rxCurrent: latest.rxSpeed,
            txCurrent: latest.txSpeed,
            rxMax: Math.max(...rxSpeeds),
            txMax: Math.max(...txSpeeds),
            rxAvg: rxSpeeds.reduce((a, b) => a + b, 0) / rxSpeeds.length,
            txAvg: txSpeeds.reduce((a, b) => a + b, 0) / txSpeeds.length,
            rxTotal: latest.rxBytes,
            txTotal: latest.txBytes,
        };
    }, [history]);

    const formatYAxis = (value: number) => {
        if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)}G`;
        if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}M`;
        if (value >= 1024) return `${(value / 1024).toFixed(1)}K`;
        return `${value}B`;
    };

    return (
        <div className="space-y-4">
            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">↓ RX Current</div>
                            <div className="text-lg font-bold text-cyan-400">{formatSpeed(stats.rxCurrent)}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">↑ TX Current</div>
                            <div className="text-lg font-bold text-pink-400">{formatSpeed(stats.txCurrent)}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">↓ RX Peak</div>
                            <div className="text-lg font-bold text-cyan-500">{formatSpeed(stats.rxMax)}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">↑ TX Peak</div>
                            <div className="text-lg font-bold text-pink-500">{formatSpeed(stats.txMax)}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Area Chart - shadcn style */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">
                        Area Chart - Traffic
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Showing real-time network traffic for the last 60 seconds
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#db2777" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#db2777" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.5)" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    tick={{ fill: "#94a3b8" }}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatYAxis}
                                    width={50}
                                    tick={{ fill: "#94a3b8" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#0f172a",
                                        border: "1px solid #334155",
                                        borderRadius: "8px",
                                    }}
                                    labelStyle={{ color: "#94a3b8" }}
                                    formatter={(value: number, name: string) => [
                                        formatSpeed(value),
                                        name === "rxSpeed" ? "Download (RX)" : "Upload (TX)",
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="rxSpeed"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    fill="url(#rxGradient)"
                                    isAnimationActive={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="txSpeed"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    fill="url(#txGradient)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                            <span className="text-slate-400">Download (RX)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-pink-500" />
                            <span className="text-slate-400">Upload (TX)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Totals - simplified */}
            {stats && (
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-slate-400 mb-1">Total Downloaded</div>
                                    <div className="text-lg font-bold text-slate-100">{formatBytes(stats.rxTotal)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 mb-1">Avg</div>
                                    <div className="text-sm text-cyan-400">{formatSpeed(stats.rxAvg)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-slate-400 mb-1">Total Uploaded</div>
                                    <div className="text-lg font-bold text-slate-100">{formatBytes(stats.txTotal)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 mb-1">Avg</div>
                                    <div className="text-sm text-pink-400">{formatSpeed(stats.txAvg)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

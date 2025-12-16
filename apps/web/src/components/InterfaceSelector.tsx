import { useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { NetworkInterface } from "@/types";
import { CATEGORIES } from "@/types";
import { formatSpeed, formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InterfaceSelectorProps {
    interfaces: NetworkInterface[];
    selectedInterface: string | null;
    onSelectInterface: (name: string) => void;
}

export function InterfaceSelector({
    interfaces,
    selectedInterface,
    onSelectInterface,
}: InterfaceSelectorProps) {
    // Group interfaces by category
    const groupedInterfaces = useMemo(() => {
        const groups: Record<string, NetworkInterface[]> = {};
        for (const iface of interfaces) {
            const category = iface.category || "other";
            if (!groups[category]) groups[category] = [];
            groups[category].push(iface);
        }
        return groups;
    }, [interfaces]);

    // Get available categories that have interfaces
    const availableCategories = useMemo(() => {
        return Object.keys(groupedInterfaces).sort((a, b) => {
            const order = ["ethernet", "wireless", "vpn", "docker", "bridge", "virtual", "loopback", "other"];
            return order.indexOf(a) - order.indexOf(b);
        });
    }, [groupedInterfaces]);

    const currentInterface = interfaces.find((i) => i.name === selectedInterface);

    return (
        <div className="space-y-4">
            {/* Category Tabs - FIXED CONTRAST */}
            <Tabs defaultValue={availableCategories[0]} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-1 bg-slate-900 border border-slate-700 p-1.5">
                    {availableCategories.map((category) => {
                        const info = CATEGORIES[category] || CATEGORIES.other;
                        const count = groupedInterfaces[category]?.length || 0;
                        return (
                            <TabsTrigger
                                key={category}
                                value={category}
                                className="flex items-center gap-1.5 text-xs text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white hover:bg-slate-800 hover:text-white"
                            >
                                <span>{info.icon}</span>
                                <span className="hidden sm:inline">{info.label}</span>
                                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-slate-600 text-slate-200">
                                    {count}
                                </Badge>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {availableCategories.map((category) => (
                    <TabsContent key={category} value={category} className="mt-3">
                        <ScrollArea className="h-[180px]">
                            <div className="space-y-2 pr-4">
                                {groupedInterfaces[category]?.map((iface) => (
                                    <InterfaceItem
                                        key={iface.name}
                                        iface={iface}
                                        isSelected={selectedInterface === iface.name}
                                        onSelect={() => onSelectInterface(iface.name)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Selected Interface Details */}
            {currentInterface && (
                <div className="space-y-3">
                    <Separator className="bg-slate-700" />

                    {/* Speed Display */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-950/50 rounded-lg p-3 border border-cyan-700/40">
                            <div className="text-xs text-cyan-300 mb-1">↓ Download</div>
                            <div className="text-xl font-bold text-cyan-400">
                                {formatSpeed(currentInterface.rxSpeed)}
                            </div>
                        </div>
                        <div className="bg-pink-950/50 rounded-lg p-3 border border-pink-700/40">
                            <div className="text-xs text-pink-300 mb-1">↑ Upload</div>
                            <div className="text-xl font-bold text-pink-400">
                                {formatSpeed(currentInterface.txSpeed)}
                            </div>
                        </div>
                    </div>

                    {/* Interface Details */}
                    <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-3 text-sm">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <DetailRow label="State" value={
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] py-0",
                                        currentInterface.state === "up"
                                            ? "border-green-500 text-green-400"
                                            : "border-red-500 text-red-400"
                                    )}
                                >
                                    {currentInterface.state}
                                </Badge>
                            } />
                            <DetailRow label="MTU" value={<span className="text-slate-200">{currentInterface.mtu}</span>} />
                            <DetailRow
                                label="MAC"
                                value={<span className="font-mono text-slate-300">{currentInterface.mac}</span>}
                                fullWidth
                            />
                            {currentInterface.speed && (
                                <DetailRow
                                    label="Link Speed"
                                    value={<span className="text-slate-200">{currentInterface.speed} Mbps</span>}
                                />
                            )}
                            {currentInterface.duplex && (
                                <DetailRow
                                    label="Duplex"
                                    value={<span className="text-slate-200 capitalize">{currentInterface.duplex}</span>}
                                />
                            )}
                            {currentInterface.ipv4.length > 0 && (
                                <DetailRow
                                    label="IPv4"
                                    value={
                                        <div className="space-y-0.5">
                                            {currentInterface.ipv4.map((ip) => (
                                                <div key={ip} className="font-mono text-green-400">{ip}</div>
                                            ))}
                                        </div>
                                    }
                                    fullWidth
                                />
                            )}
                            {currentInterface.ipv6.length > 0 && (
                                <DetailRow
                                    label="IPv6"
                                    value={
                                        <div className="space-y-0.5">
                                            {currentInterface.ipv6.map((ip) => (
                                                <div key={ip} className="font-mono text-blue-400 text-[10px]">{ip}</div>
                                            ))}
                                        </div>
                                    }
                                    fullWidth
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({
    label,
    value,
    fullWidth = false
}: {
    label: string;
    value: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={cn("flex items-start gap-2", fullWidth && "col-span-2")}>
            <span className="text-slate-500 shrink-0">{label}:</span>
            {value}
        </div>
    );
}

interface InterfaceItemProps {
    iface: NetworkInterface;
    isSelected: boolean;
    onSelect: () => void;
}

const InterfaceItem = memo(function InterfaceItem({ iface, isSelected, onSelect }: InterfaceItemProps) {
    const categoryInfo = CATEGORIES[iface.category] || CATEGORIES.other;

    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                isSelected
                    ? "bg-slate-700/60 border-slate-500"
                    : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70 hover:border-slate-600"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={cn("text-sm", categoryInfo.color)}>{categoryInfo.icon}</span>
                    <span className="font-mono text-sm text-slate-100">{iface.name}</span>
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[9px] py-0 px-1",
                            iface.state === "up" ? "border-green-600 text-green-500" : "border-slate-600 text-slate-500"
                        )}
                    >
                        {iface.state}
                    </Badge>
                </div>
                {isSelected && (
                    <span className="text-[10px] text-slate-400">●</span>
                )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-cyan-400">↓ {formatSpeed(iface.rxSpeed)}</span>
                <span className="text-pink-400">↑ {formatSpeed(iface.txSpeed)}</span>
                <span className="ml-auto text-slate-500">{formatBytes(iface.rxBytes + iface.txBytes)}</span>
            </div>
        </button>
    );
});

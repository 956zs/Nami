import { memo, useState } from "react";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useSettings } from "@/contexts/SettingsContext";
import { InterfaceSelector } from "@/components/InterfaceSelector";
import { NetworkChart } from "@/components/NetworkChart";
import { ProcessList } from "@/components/ProcessList";
import { BandwidthList, TopBandwidth } from "@/components/BandwidthList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes } from "@/lib/format";

const MemoizedChart = memo(NetworkChart);

function App() {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<"interfaces" | "processes" | "bandwidth">("interfaces");

  const {
    interfaces,
    processes,
    bandwidth,
    bandwidthEnabled,
    selectedInterface,
    setSelectedInterface,
    isConnected,
    error,
    history,
    refreshDetails,
  } = useNetworkStats({
    updateInterval: settings.updateInterval,
    maxDataPoints: settings.maxDataPoints,
    reconnectInterval: settings.reconnectInterval,
    showLoopback: settings.showLoopback,
    showDocker: settings.showDocker,
  });

  const selectedHistory = selectedInterface
    ? history.get(selectedInterface) || []
    : [];

  const totalRx = interfaces.reduce((acc, i) => acc + i.rxBytes, 0);
  const totalTx = interfaces.reduce((acc, i) => acc + i.txBytes, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐳</span>
            <h1 className="text-xl font-semibold">Nami</h1>
            <Badge variant="outline" className="border-cyan-600 text-cyan-400">v2.1</Badge>
            {bandwidthEnabled && (
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                📈 Bandwidth
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SettingsDialog />
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDetails}
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
            >
              🔄 Refresh
            </Button>
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className={isConnected ? "bg-green-600" : ""}
            >
              {isConnected ? "● Connected" : "○ Disconnected"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="bg-slate-900 border border-slate-700">
            <TabsTrigger
              value="interfaces"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🔌 Interfaces
            </TabsTrigger>
            <TabsTrigger
              value="processes"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📦 Processes
              <Badge className="ml-2 bg-slate-600 text-xs">{processes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="bandwidth"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📈 Bandwidth
              {bandwidthEnabled && (
                <Badge className="ml-2 bg-green-600/30 text-green-400 text-xs">LIVE</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Interfaces Tab */}
          <TabsContent value="interfaces" className="mt-4 space-y-4">
            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-lg p-4 text-red-300">
                ⚠️ {error}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Total:</span>
              <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                ↓ {formatBytes(totalRx)}
              </Badge>
              <Badge variant="outline" className="border-pink-600 text-pink-400">
                ↑ {formatBytes(totalTx)}
              </Badge>
              <span className="ml-auto text-xs text-slate-500">
                {interfaces.length} interfaces
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Network Interfaces
                  </CardTitle>
                </CardHeader>
                <Separator className="bg-slate-800" />
                <CardContent className="pt-4">
                  <InterfaceSelector
                    interfaces={interfaces}
                    selectedInterface={selectedInterface}
                    onSelectInterface={setSelectedInterface}
                  />
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                {selectedInterface ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span>Monitoring:</span>
                      <Badge variant="outline" className="font-mono border-slate-500 text-slate-200 bg-slate-800/50">
                        {selectedInterface}
                      </Badge>
                    </div>
                    <MemoizedChart
                      history={selectedHistory}
                      interfaceName={selectedInterface}
                    />
                  </>
                ) : (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="flex items-center justify-center h-[300px] text-slate-500">
                      {isConnected ? "Select an interface" : "Connecting..."}
                    </CardContent>
                  </Card>
                )}

                {/* Top Bandwidth on main page */}
                <TopBandwidth bandwidth={bandwidth} enabled={bandwidthEnabled} />
              </div>
            </div>
          </TabsContent>

          {/* Processes Tab */}
          <TabsContent value="processes" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <span>All processes with network connections</span>
              <span className="ml-auto text-xs text-slate-500">
                {processes.length} processes
              </span>
            </div>
            <ProcessList processes={processes} />
          </TabsContent>

          {/* Bandwidth Tab */}
          <TabsContent value="bandwidth" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <span>Per-process bandwidth usage (via nethogs)</span>
              {!bandwidthEnabled && (
                <Badge variant="outline" className="border-yellow-600 text-yellow-400 text-xs">
                  Requires root
                </Badge>
              )}
            </div>
            <BandwidthList bandwidth={bandwidth} enabled={bandwidthEnabled} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-600">
          Nami Network Monitor v2.1 • {bandwidthEnabled ? "Bandwidth monitoring active" : "Run as root for bandwidth"}
        </div>
      </footer>
    </div>
  );
}

export default App;

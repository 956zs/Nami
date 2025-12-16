import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/contexts/SettingsContext";

export function SettingsDialog() {
    const { settings, updateSettings, resetSettings } = useSettings();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                >
                    ⚙️ Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-600 text-slate-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg">Settings</DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Adjust monitoring parameters
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Update Interval */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-white font-medium">Update Interval</Label>
                            <span className="text-sm text-cyan-400 font-mono font-bold">
                                {settings.updateInterval}ms
                            </span>
                        </div>
                        <div className="relative">
                            <Slider
                                value={[settings.updateInterval]}
                                onValueChange={([value]) => updateSettings({ updateInterval: value })}
                                min={250}
                                max={5000}
                                step={250}
                                className="w-full [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:border-cyan-500 [&_[data-slot=slider-thumb]]:bg-white"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            How often the UI refreshes (lower = smoother but uses more CPU)
                        </p>
                    </div>

                    <Separator className="bg-slate-600" />

                    {/* History Length */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-white font-medium">Chart History</Label>
                            <span className="text-sm text-cyan-400 font-mono font-bold">
                                {settings.maxDataPoints} points
                            </span>
                        </div>
                        <Slider
                            value={[settings.maxDataPoints]}
                            onValueChange={([value]) => updateSettings({ maxDataPoints: value })}
                            min={30}
                            max={300}
                            step={10}
                            className="w-full [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:border-cyan-500 [&_[data-slot=slider-thumb]]:bg-white"
                        />
                        <p className="text-xs text-slate-400">
                            Number of data points shown in the chart
                        </p>
                    </div>

                    <Separator className="bg-slate-600" />

                    {/* Interface Filters */}
                    <div className="space-y-4">
                        <Label className="text-white font-medium">Interface Visibility</Label>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white">Show Loopback</p>
                                <p className="text-xs text-slate-400">Display lo interface</p>
                            </div>
                            <Switch
                                checked={settings.showLoopback}
                                onCheckedChange={(checked) => updateSettings({ showLoopback: checked })}
                                className="data-[state=checked]:bg-cyan-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white">Show Docker</p>
                                <p className="text-xs text-slate-400">Display Docker/veth interfaces</p>
                            </div>
                            <Switch
                                checked={settings.showDocker}
                                onCheckedChange={(checked) => updateSettings({ showDocker: checked })}
                                className="data-[state=checked]:bg-cyan-500"
                            />
                        </div>
                    </div>

                    <Separator className="bg-slate-600" />

                    {/* Display Options */}
                    <div className="space-y-4">
                        <Label className="text-white font-medium">Display Options</Label>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white">Compact Mode</p>
                                <p className="text-xs text-slate-400">Smaller interface cards</p>
                            </div>
                            <Switch
                                checked={settings.compactMode}
                                onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
                                className="data-[state=checked]:bg-cyan-500"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={resetSettings}
                        className="border-slate-500 text-white bg-slate-800 hover:bg-slate-700 hover:text-white"
                    >
                        Reset to Defaults
                    </Button>
                    <Button
                        onClick={() => setOpen(false)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface Settings {
    updateInterval: number;      // UI update interval in ms (500-5000)
    maxDataPoints: number;       // Chart history length (30-120)
    reconnectInterval: number;   // WebSocket reconnect delay in ms
    showLoopback: boolean;       // Show loopback interface
    showDocker: boolean;         // Show Docker interfaces
    compactMode: boolean;        // Compact interface list
}

const defaultSettings: Settings = {
    updateInterval: 1000,
    maxDataPoints: 60,
    reconnectInterval: 3000,
    showLoopback: true,
    showDocker: true,
    compactMode: false,
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => void;
    resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "nami-settings";

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        // Load from localStorage on init
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...defaultSettings, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
        return defaultSettings;
    });

    // Save to localStorage when settings change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    }, [settings]);

    const updateSettings = (partial: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...partial }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}

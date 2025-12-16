import { Elysia } from "elysia";
import { getNetworkStats, getAvailableInterfaces, refreshDetailsCache } from "./network/stats";
import { getProcessNetworkInfo, getTopProcesses } from "./network/process";
import { nethogsMonitor, type ProcessBandwidth } from "./network/nethogs";
import type { NetworkStatsPayload } from "./types";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const UPDATE_INTERVAL = 1000;

// Store active WebSocket connections
const clients = new Set<{ send: (data: string) => void }>();

// Connection tracking for optimized logging
let lastClientCount = 0;
let lastLogTime = Date.now();
const LOG_THROTTLE_MS = 5000;

function logConnectionStatus() {
    const now = Date.now();
    const currentCount = clients.size;

    if (currentCount !== lastClientCount && (now - lastLogTime > LOG_THROTTLE_MS)) {
        const delta = currentCount - lastClientCount;
        const arrow = delta > 0 ? "↑" : "↓";
        console.log(`📡 Clients: ${currentCount} (${arrow}${Math.abs(delta)})`);
        lastClientCount = currentCount;
        lastLogTime = now;
    }
}

// Create Elysia app
const app = new Elysia()
    .get("/", () => ({
        message: "🐳 Nami Network Monitor Server v2.1",
        version: "2.1.0",
        bandwidthEnabled: nethogsMonitor.isActive(),
        endpoints: {
            websocket: "/ws",
            interfaces: "/api/interfaces",
            processes: "/api/processes",
            bandwidth: "/api/bandwidth",
            refresh: "/api/refresh",
        }
    }))

    .get("/api/interfaces", () => ({
        interfaces: getAvailableInterfaces()
    }))

    .get("/api/processes", () => ({
        processes: getProcessNetworkInfo()
    }))

    .get("/api/bandwidth", () => ({
        enabled: nethogsMonitor.isActive(),
        data: nethogsMonitor.getData()
    }))

    .post("/api/refresh", () => {
        refreshDetailsCache();
        return {
            success: true,
            message: "Details cache will be refreshed on next update"
        };
    })

    .ws("/ws", {
        open(ws) {
            clients.add(ws);
            logConnectionStatus();

            const payload: NetworkStatsPayload = {
                interfaces: getNetworkStats(),
                processes: getProcessNetworkInfo(),
                topProcesses: getTopProcesses(5),
                bandwidth: nethogsMonitor.getData(),
                bandwidthEnabled: nethogsMonitor.isActive(),
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(payload));
        },

        close(ws) {
            clients.delete(ws);
            logConnectionStatus();
        },

        message(ws, message) {
            if (message === "ping") {
                ws.send("pong");
            }
            if (message === "refresh") {
                refreshDetailsCache();
                ws.send(JSON.stringify({ type: "refreshed" }));
            }
        }
    })

    .listen(PORT);

// Start nethogs if running as root
const isRoot = process.getuid?.() === 0;
if (isRoot) {
    nethogsMonitor.start();
}

// Startup banner
console.log(`
🐳 Nami Network Monitor Server v2.1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Web:       http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}/ws
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 IP/MAC cache:    5 min
📊 Process mode:    enabled
📈 Bandwidth mode:  ${isRoot ? "enabled (nethogs)" : "disabled (need root)"}
🔑 Running as:      ${isRoot ? "root ✓" : "user"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Broadcast stats
function broadcastStats() {
    if (clients.size === 0) return;

    const payload: NetworkStatsPayload = {
        interfaces: getNetworkStats(),
        processes: getProcessNetworkInfo(),
        topProcesses: getTopProcesses(5),
        bandwidth: nethogsMonitor.getData(),
        bandwidthEnabled: nethogsMonitor.isActive(),
        timestamp: Date.now()
    };

    const message = JSON.stringify(payload);

    for (const client of clients) {
        try {
            client.send(message);
        } catch {
            clients.delete(client);
        }
    }
}

setInterval(broadcastStats, UPDATE_INTERVAL);

// Cleanup on exit
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    nethogsMonitor.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    nethogsMonitor.stop();
    process.exit(0);
});

export type App = typeof app;

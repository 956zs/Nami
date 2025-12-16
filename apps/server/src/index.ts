import { Elysia } from "elysia";
import { getNetworkStats, getAvailableInterfaces, refreshDetailsCache } from "./network/stats";
import { getProcessNetworkInfo, getTopProcesses } from "./network/process";
import { nethogsMonitor } from "./network/nethogs";
import type { NetworkStatsPayload } from "./types";

import pkg from "../package.json";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const UPDATE_INTERVAL = 1000;

const clients = new Set<{ send: (data: string) => void }>();
let totalConnections = 0;
let statsLogInterval: ReturnType<typeof setInterval> | null = null;
let maintenanceInterval: ReturnType<typeof setInterval> | null = null;

// Maintenance interval - runs every 5 minutes to cleanup stale data
const MAINTENANCE_INTERVAL = 5 * 60 * 1000;

const app = new Elysia()
    .get("/", () => ({
        message: `Nami Network Monitor Server v${pkg.version}`,
        version: pkg.version,
        clients: clients.size,
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
        return { success: true, message: "Cache refreshed" };
    })

    .ws("/ws", {
        open(ws) {
            clients.add(ws);
            totalConnections++;

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
        },

        message(ws, message) {
            if (message === "ping") ws.send("pong");
            if (message === "refresh") {
                refreshDetailsCache();
                ws.send(JSON.stringify({ type: "refreshed" }));
            }
        }
    })

    .listen(PORT);

const isRoot = process.getuid?.() === 0;
if (isRoot) {
    nethogsMonitor.start();
}

console.log(`
Nami Network Monitor Server v2.1
--------------------------------
Web:       http://localhost:${PORT}
WebSocket: ws://localhost:${PORT}/ws
--------------------------------
Bandwidth: ${isRoot ? "enabled (nethogs)" : "disabled (need root)"}
User:      ${isRoot ? "root" : process.env.USER || "user"}
--------------------------------
`);

statsLogInterval = setInterval(() => {
    console.log(`[stats] ${clients.size} clients, ${totalConnections} total`);
}, 30000);

// Periodic maintenance to prevent memory leaks
maintenanceInterval = setInterval(() => {
    const result = nethogsMonitor.cleanupStaleData();
    if (result.processesRemoved > 0 || result.cacheEntriesRemoved > 0) {
        console.log(`[maintenance] Cleaned: ${result.processesRemoved} processes, ${result.cacheEntriesRemoved} cache entries`);
    }
}, MAINTENANCE_INTERVAL);

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

process.on("SIGINT", () => {
    console.log("\nShutting down...");
    if (statsLogInterval) clearInterval(statsLogInterval);
    if (maintenanceInterval) clearInterval(maintenanceInterval);
    nethogsMonitor.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    if (statsLogInterval) clearInterval(statsLogInterval);
    if (maintenanceInterval) clearInterval(maintenanceInterval);
    nethogsMonitor.stop();
    process.exit(0);
});

export type App = typeof app;

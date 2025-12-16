import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import type { NetworkInterface, InterfaceDetails } from "../types";

// Store previous readings for speed calculation
let previousStats: Map<string, { rxBytes: number; txBytes: number; timestamp: number }> = new Map();

// Cache for interface details (IP, MAC, etc.) - refreshed every 5 minutes
let detailsCache: Map<string, InterfaceDetails> = new Map();
let lastDetailsCacheTime = 0;
const DETAILS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

/**
 * Force refresh the details cache
 */
export function refreshDetailsCache(): void {
    lastDetailsCacheTime = 0;
    detailsCache.clear();
    console.log("🔄 Details cache cleared, will refresh on next request");
}

/**
 * Parse /proc/net/dev to extract network interface statistics
 */
function parseProcNetDev(): Map<string, { rxBytes: number; txBytes: number }> {
    const result = new Map<string, { rxBytes: number; txBytes: number }>();

    try {
        const content = readFileSync("/proc/net/dev", "utf-8");
        const lines = content.split("\n");

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const colonIndex = line.indexOf(":");
            if (colonIndex === -1) continue;

            const interfaceName = line.substring(0, colonIndex).trim();
            const statsStr = line.substring(colonIndex + 1).trim();
            const stats = statsStr.split(/\s+/).map(Number);

            if (stats.length >= 9) {
                result.set(interfaceName, {
                    rxBytes: stats[0],
                    txBytes: stats[8],
                });
            }
        }
    } catch (error) {
        console.error("Failed to read /proc/net/dev:", error);
    }

    return result;
}

/**
 * Get interface details - uses cache, only refreshes every 5 minutes
 */
function getInterfaceDetails(name: string): InterfaceDetails {
    const now = Date.now();

    // Check if cache is still valid
    if (now - lastDetailsCacheTime < DETAILS_CACHE_TTL && detailsCache.has(name)) {
        return detailsCache.get(name)!;
    }

    // If cache expired, refresh all details at once
    if (now - lastDetailsCacheTime >= DETAILS_CACHE_TTL) {
        refreshAllInterfaceDetails();
        lastDetailsCacheTime = now;
    }

    return detailsCache.get(name) || {
        mac: "unknown",
        mtu: 0,
        state: "unknown",
        speed: null,
        duplex: null,
        ipv4: [],
        ipv6: [],
    };
}

/**
 * Refresh details for all interfaces at once (more efficient)
 */
function refreshAllInterfaceDetails(): void {
    const interfaces = parseProcNetDev();

    for (const name of interfaces.keys()) {
        const details = fetchInterfaceDetails(name);
        detailsCache.set(name, details);
    }

    console.log(`📋 Refreshed details cache for ${interfaces.size} interfaces`);
}

/**
 * Fetch details for a single interface from /sys and ip command
 */
function fetchInterfaceDetails(name: string): InterfaceDetails {
    const basePath = `/sys/class/net/${name}`;
    const details: InterfaceDetails = {
        mac: "unknown",
        mtu: 0,
        state: "unknown",
        speed: null,
        duplex: null,
        ipv4: [],
        ipv6: [],
    };

    try {
        // MAC Address
        if (existsSync(`${basePath}/address`)) {
            details.mac = readFileSync(`${basePath}/address`, "utf-8").trim();
        }

        // MTU
        if (existsSync(`${basePath}/mtu`)) {
            details.mtu = parseInt(readFileSync(`${basePath}/mtu`, "utf-8").trim(), 10);
        }

        // Operstate (up/down/unknown)
        if (existsSync(`${basePath}/operstate`)) {
            details.state = readFileSync(`${basePath}/operstate`, "utf-8").trim();
        }

        // Speed (only for physical interfaces)
        if (existsSync(`${basePath}/speed`)) {
            try {
                const speed = parseInt(readFileSync(`${basePath}/speed`, "utf-8").trim(), 10);
                if (!isNaN(speed) && speed > 0) {
                    details.speed = speed;
                }
            } catch {
                // Speed file exists but read failed
            }
        }

        // Duplex
        if (existsSync(`${basePath}/duplex`)) {
            try {
                details.duplex = readFileSync(`${basePath}/duplex`, "utf-8").trim();
            } catch {
                // Duplex file exists but read failed
            }
        }

        // Get IP addresses using ip command
        try {
            const output = execSync(`ip addr show ${name} 2>/dev/null`, { encoding: "utf-8" });

            // Parse IPv4 addresses
            const ipv4Matches = output.matchAll(/inet (\d+\.\d+\.\d+\.\d+\/\d+)/g);
            for (const match of ipv4Matches) {
                details.ipv4.push(match[1]);
            }

            // Parse IPv6 addresses (excluding link-local fe80::)
            const ipv6Matches = output.matchAll(/inet6 ([a-f0-9:]+\/\d+)/g);
            for (const match of ipv6Matches) {
                if (!match[1].startsWith("fe80:")) {
                    details.ipv6.push(match[1]);
                }
            }
        } catch {
            // ip command failed
        }
    } catch (error) {
        console.error(`Failed to get details for ${name}:`, error);
    }

    return details;
}

/**
 * Categorize network interface by name pattern
 */
export function categorizeInterface(name: string): string {
    if (name === "lo") return "loopback";
    if (name === "docker0" || name.startsWith("br-") || name.startsWith("veth")) return "docker";
    if (name.startsWith("virbr") || name.startsWith("vnet")) return "virtual";
    if (name.startsWith("tun") || name.startsWith("tap") ||
        name.startsWith("wg") || name.startsWith("tailscale") ||
        name.startsWith("nordlynx") || name.startsWith("proton")) return "vpn";
    if (name.startsWith("wl") || name.startsWith("wlan") || name.startsWith("wifi")) return "wireless";
    if (name.startsWith("eth") || name.startsWith("en") || name.startsWith("em")) return "ethernet";
    if (name.startsWith("br") || name.includes("bridge")) return "bridge";
    return "other";
}

/**
 * Get current network statistics with calculated speeds (ALL interfaces)
 */
export function getNetworkStats(): NetworkInterface[] {
    const currentStats = parseProcNetDev();
    const currentTime = Date.now();
    const result: NetworkInterface[] = [];

    for (const [name, current] of currentStats) {
        const previous = previousStats.get(name);
        let rxSpeed = 0;
        let txSpeed = 0;

        if (previous) {
            const timeDelta = (currentTime - previous.timestamp) / 1000;
            if (timeDelta > 0) {
                rxSpeed = Math.max(0, (current.rxBytes - previous.rxBytes) / timeDelta);
                txSpeed = Math.max(0, (current.txBytes - previous.txBytes) / timeDelta);
            }
        }

        const details = getInterfaceDetails(name);

        result.push({
            name,
            category: categorizeInterface(name),
            rxBytes: current.rxBytes,
            txBytes: current.txBytes,
            rxSpeed,
            txSpeed,
            ...details,
        });

        previousStats.set(name, {
            rxBytes: current.rxBytes,
            txBytes: current.txBytes,
            timestamp: currentTime,
        });
    }

    // Sort by category then name
    result.sort((a, b) => {
        const categoryOrder = ["ethernet", "wireless", "vpn", "docker", "bridge", "virtual", "loopback", "other"];
        const aIdx = categoryOrder.indexOf(a.category);
        const bIdx = categoryOrder.indexOf(b.category);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.name.localeCompare(b.name);
    });

    return result;
}

/**
 * Get list of available network interfaces
 */
export function getAvailableInterfaces(): string[] {
    const stats = parseProcNetDev();
    return Array.from(stats.keys()).sort();
}

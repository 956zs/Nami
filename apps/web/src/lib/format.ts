/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format bytes per second to human-readable speed
 */
export function formatSpeed(bytesPerSecond: number): string {
    return formatBytes(bytesPerSecond) + "/s";
}

/**
 * Format timestamp to time string
 */
export function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

/**
 * Format relative time offset in milliseconds to a readable string (e.g., "-45s", "0s")
 */
export function formatRelativeTime(offsetMs: number): string {
    const seconds = Math.round(offsetMs / 1000);
    return `${seconds}s`;
}

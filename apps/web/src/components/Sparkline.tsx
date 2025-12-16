import { memo, useMemo } from "react";

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

export const Sparkline = memo(function Sparkline({
    data,
    color = "#06b6d4",
    width = 80,
    height = 24,
}: SparklineProps) {
    const path = useMemo(() => {
        if (data.length < 2) return "";

        const max = Math.max(...data, 0.001); // Avoid division by zero
        const min = 0;
        const range = max - min || 1;

        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            return `${x},${y}`;
        });

        return `M${points.join(" L")}`;
    }, [data, width, height]);

    if (data.length < 2) {
        return (
            <svg width={width} height={height} className="opacity-30">
                <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize={8}>
                    ...
                </text>
            </svg>
        );
    }

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});

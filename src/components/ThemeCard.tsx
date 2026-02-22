"use client";

import React from "react";
import { Theme } from "@/lib/themes";

interface ThemeCardProps {
    theme: Theme;
    onClick: () => void;
}

export default function ThemeCard({ theme, onClick }: ThemeCardProps) {
    // Find the background layer (lowest zIndex)
    const bgLayer = [...theme.layers]
        .sort((a, b) => a.zIndex - b.zIndex)
        .find((l) => l.url && !l.url.startsWith("idb://"));

    // Compute aspect ratio — cap landscape at 1:1 so cards don't look squat
    const rawAspect = theme.width && theme.height
        ? theme.width / theme.height
        : 3 / 4;
    const aspectRatio = Math.min(rawAspect, 1); // landscape → square, portrait keeps ratio

    return (
        <button
            onClick={onClick}
            className="card group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 active:scale-[0.97] text-left w-full"
        >
            <div
                className="relative overflow-hidden rounded-t-[var(--radius-card)]"
                style={{
                    aspectRatio: `${aspectRatio}`,
                    background: "#e8e4df",
                }}
            >
                {bgLayer && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={bgLayer.url}
                        alt={theme.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    />
                )}
            </div>
            <div className="p-3">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                    {theme.name}
                </h3>
            </div>
        </button>
    );
}


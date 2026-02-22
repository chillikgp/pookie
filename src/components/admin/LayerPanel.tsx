"use client";

import React from "react";
import { useAdminStore } from "@/lib/admin/themeState";

/**
 * Layer ordering panel.
 * Constraints:
 *  - Background (zIndex 0) always at bottom — not reorderable
 *  - Baby zIndex can be changed relative to mid/foreground
 *  - Layers can be toggled visible/invisible
 */
export default function LayerPanel() {
    const { theme, updateBabyZIndex, updateLayers } = useAdminStore();
    if (!theme) return null;

    // Build display list: layers + virtual baby entry
    const sortedLayers = [...theme.layers].sort((a, b) => a.zIndex - b.zIndex);

    // Get layer labels
    function layerLabel(url: string, zIndex: number): string {
        if (url.includes("background")) return "🖼️ Background";
        if (url.includes("foreground")) return "✨ Foreground";
        if (url.includes("mid")) return "📋 Mid Layer";
        return `Layer (z:${zIndex})`;
    }

    const toggleVisibility = (url: string) => {
        const updated = theme.layers.map((l) =>
            l.url === url ? { ...l, visible: l.visible === false ? true : false } : l
        );
        updateLayers(updated);
    };

    const moveLayerUp = (url: string) => {
        const layer = theme.layers.find((l) => l.url === url);
        if (!layer || layer.zIndex === 0) return; // Can't move background
        const updated = theme.layers.map((l) => {
            if (l.url === url) return { ...l, zIndex: l.zIndex + 1 };
            if (l.zIndex === layer.zIndex + 1) return { ...l, zIndex: l.zIndex - 1 };
            return l;
        });
        updateLayers(updated);
    };

    const moveLayerDown = (url: string) => {
        const layer = theme.layers.find((l) => l.url === url);
        if (!layer || layer.zIndex <= 1) return; // Can't go below 1 (background is 0)
        const updated = theme.layers.map((l) => {
            if (l.url === url) return { ...l, zIndex: l.zIndex - 1 };
            if (l.zIndex === layer.zIndex - 1 && l.zIndex > 0) return { ...l, zIndex: l.zIndex + 1 };
            return l;
        });
        updateLayers(updated);
    };

    // Build ordered display: all layers + baby
    const displayItems: { type: "layer" | "baby"; url?: string; zIndex: number; visible: boolean; label: string }[] = [];

    for (const l of sortedLayers) {
        displayItems.push({
            type: "layer",
            url: l.url,
            zIndex: l.zIndex,
            visible: l.visible !== false,
            label: layerLabel(l.url, l.zIndex),
        });
    }
    displayItems.push({
        type: "baby",
        zIndex: theme.babyZIndex,
        visible: true,
        label: "👶 Baby",
    });
    displayItems.sort((a, b) => b.zIndex - a.zIndex); // Top first

    return (
        <div className="p-4 space-y-4">
            <p className="text-[10px] text-[#555] uppercase tracking-wide font-semibold">Layer Stack (top → bottom)</p>

            <div className="space-y-1.5">
                {displayItems.map((item, i) => {
                    const isBackground = item.type === "layer" && item.url?.includes("background");
                    return (
                        <div
                            key={item.url || "baby"}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${item.type === "baby"
                                    ? "bg-[#ee652b]/10 border-[#ee652b]/20"
                                    : "bg-[#1a1a24] border-[#2a2a3a]"
                                }`}
                        >
                            {/* Label */}
                            <span className={`flex-1 text-xs font-semibold ${item.visible ? "text-white" : "text-[#555]"}`}>
                                {item.label}
                            </span>

                            {/* Z-index */}
                            <span className="text-[9px] font-mono text-[#555]">z:{item.zIndex}</span>

                            {/* Controls */}
                            {item.type === "baby" ? (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => updateBabyZIndex(theme.babyZIndex + 1)}
                                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-[#2a2a3a] rounded hover:bg-[#3a3a4a] text-white"
                                    >▲</button>
                                    <button
                                        onClick={() => updateBabyZIndex(Math.max(1, theme.babyZIndex - 1))}
                                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-[#2a2a3a] rounded hover:bg-[#3a3a4a] text-white"
                                    >▼</button>
                                </div>
                            ) : (
                                <div className="flex gap-1">
                                    {/* Visibility toggle */}
                                    <button
                                        onClick={() => item.url && toggleVisibility(item.url)}
                                        className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${item.visible ? "bg-[#2a2a3a] text-white" : "bg-[#1a1a20] text-[#444]"
                                            }`}
                                    >
                                        {item.visible ? "👁" : "🚫"}
                                    </button>
                                    {/* Move buttons (not for background) */}
                                    {!isBackground && (
                                        <>
                                            <button
                                                onClick={() => item.url && moveLayerUp(item.url)}
                                                className="w-5 h-5 flex items-center justify-center text-[10px] bg-[#2a2a3a] rounded hover:bg-[#3a3a4a] text-white"
                                            >▲</button>
                                            <button
                                                onClick={() => item.url && moveLayerDown(item.url)}
                                                className="w-5 h-5 flex items-center justify-center text-[10px] bg-[#2a2a3a] rounded hover:bg-[#3a3a4a] text-white"
                                            >▼</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-[#0f0f13] rounded-lg p-3 text-[10px] text-[#555]">
                <p>⚠ Background is fixed at z:0 and cannot be reordered.</p>
                <p>Baby zIndex is relative to other layers.</p>
            </div>
        </div>
    );
}

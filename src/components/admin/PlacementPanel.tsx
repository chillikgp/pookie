"use client";

import React from "react";
import { useAdminStore } from "@/lib/admin/themeState";

export default function PlacementPanel() {
    const { theme, updatePlacement } = useAdminStore();
    if (!theme) return null;

    const p = theme.babyPlacement;

    return (
        <div className="p-4 space-y-5">
            <p className="text-[10px] text-[#555] uppercase tracking-wide font-semibold">Baby Placement (% of canvas)</p>

            {/* X */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-xs text-[#999]">X Position</span>
                    <span className="text-[10px] font-mono text-[#666]">{p.x.toFixed(1)}%</span>
                </div>
                <input type="range" min={0} max={100} step={0.5} value={p.x}
                    onChange={(e) => updatePlacement({ x: parseFloat(e.target.value) })}
                    className="w-full accent-[#ee652b]" />
            </div>

            {/* Y */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-xs text-[#999]">Y Position</span>
                    <span className="text-[10px] font-mono text-[#666]">{p.y.toFixed(1)}%</span>
                </div>
                <input type="range" min={0} max={100} step={0.5} value={p.y}
                    onChange={(e) => updatePlacement({ y: parseFloat(e.target.value) })}
                    className="w-full accent-[#ee652b]" />
            </div>

            {/* Width */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-xs text-[#999]">Width</span>
                    <span className="text-[10px] font-mono text-[#666]">{p.width.toFixed(1)}%</span>
                </div>
                <input type="range" min={10} max={100} step={0.5} value={p.width}
                    onChange={(e) => updatePlacement({ width: parseFloat(e.target.value) })}
                    className="w-full accent-[#ee652b]" />
            </div>

            {/* Height */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-xs text-[#999]">Height</span>
                    <span className="text-[10px] font-mono text-[#666]">{p.height.toFixed(1)}%</span>
                </div>
                <input type="range" min={10} max={100} step={0.5} value={p.height}
                    onChange={(e) => updatePlacement({ height: parseFloat(e.target.value) })}
                    className="w-full accent-[#ee652b]" />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-xs text-[#999]">Rotation</span>
                    <span className="text-[10px] font-mono text-[#666]">{p.rotation}°</span>
                </div>
                <input type="range" min={-180} max={180} step={1} value={p.rotation}
                    onChange={(e) => updatePlacement({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-[#ee652b]" />
            </div>

            {/* Anchor */}
            <div className="space-y-2">
                <span className="text-xs text-[#999]">Anchor</span>
                <div className="flex gap-2">
                    {(["top", "center", "bottom"] as const).map((a) => (
                        <button
                            key={a}
                            onClick={() => updatePlacement({ anchor: a })}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${p.anchor === a
                                    ? "bg-[#ee652b]/15 text-[#ee652b] border border-[#ee652b]/30"
                                    : "bg-[#1a1a24] text-[#666] border border-[#2a2a3a]"
                                }`}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pixel values info */}
            {theme && (
                <div className="bg-[#0f0f13] rounded-lg p-3 text-[10px] text-[#555] space-y-0.5">
                    <p className="font-semibold text-[#666] mb-1">Native Pixels</p>
                    <p>x: {Math.round(theme.width * p.x / 100)} • y: {Math.round(theme.height * p.y / 100)}</p>
                    <p>w: {Math.round(theme.width * p.width / 100)} • h: {Math.round(theme.height * p.height / 100)}</p>
                </div>
            )}
        </div>
    );
}

"use client";

import React from "react";
import { useAdminStore } from "@/lib/admin/themeState";

/**
 * Default adjust preset panel.
 * Uses SAME slider ranges as consumer AdjustTools.
 * Only affects baby layer — not background, not whole canvas.
 * "Save As Theme Default" writes to theme.defaultAdjust.
 */

interface SliderDef {
    key: "brightness" | "contrast" | "vibrance" | "warmth";
    label: string;
    icon: string;
    min: number;
    max: number;
    step: number;
    displayMultiplier: number;
}

const sliders: SliderDef[] = [
    { key: "brightness", label: "Brightness", icon: "☀️", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
    { key: "contrast", label: "Contrast", icon: "◐", min: -50, max: 50, step: 1, displayMultiplier: 1 },
    { key: "vibrance", label: "Vibrance", icon: "💎", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
    { key: "warmth", label: "Warmth", icon: "🔥", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
];

export default function AdjustPanel() {
    const { theme, updateDefaultAdjust } = useAdminStore();
    if (!theme) return null;

    const adj = theme.defaultAdjust;

    return (
        <div className="p-4 space-y-5">
            <div>
                <p className="text-[10px] text-[#555] uppercase tracking-wide font-semibold">Default Adjust (Baby Layer Only)</p>
                <p className="text-[9px] text-[#444] mt-1">
                    These values auto-apply to baby when consumer loads this theme
                </p>
            </div>

            {sliders.map((s) => {
                const value = adj[s.key];
                const displayValue = Math.round(value * s.displayMultiplier);
                return (
                    <div key={s.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#999] flex items-center gap-1.5">
                                <span>{s.icon}</span>
                                {s.label}
                            </span>
                            <span className="text-[10px] font-mono text-[#666]">
                                {displayValue > 0 ? "+" : ""}{displayValue}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={value}
                            onChange={(e) =>
                                updateDefaultAdjust({ [s.key]: parseFloat(e.target.value) })
                            }
                            className="w-full accent-[#ee652b]"
                        />
                    </div>
                );
            })}

            <button
                onClick={() =>
                    updateDefaultAdjust({ brightness: 0, contrast: 0, vibrance: 0, warmth: 0 })
                }
                className="w-full py-2.5 bg-[#1a1a24] border border-[#2a2a3a] text-[#999] rounded-lg text-xs font-semibold hover:text-white transition-colors"
            >
                Reset to Zero
            </button>

            <div className="bg-[#0f0f13] rounded-lg p-3 text-[10px] text-[#555]">
                <p>💡 Changes are applied to dummy baby preview.</p>
                <p>Save Draft or Publish to persist as theme default.</p>
            </div>
        </div>
    );
}

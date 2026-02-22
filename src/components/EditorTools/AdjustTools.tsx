"use client";

import React from "react";
import { useEditorStore } from "@/lib/store";

interface SliderConfig {
    key: "brightness" | "contrast" | "vibrance" | "warmth";
    label: string;
    icon: string;
    min: number;
    max: number;
    step: number;
    displayMultiplier: number; // multiply value for display
}

/**
 * Slider ranges matched to Konva filter units:
 *  - brightness: -1 to 1 (Konva.Filters.Brighten)
 *  - contrast: -100 to 100 (Konva.Filters.Contrast)
 *  - vibrance: -1 to 1 (Konva.Filters.HSL saturation)
 *  - warmth: -1 to 1 (RGB shift)
 */
const sliders: SliderConfig[] = [
    { key: "brightness", label: "Brightness", icon: "☀️", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
    { key: "contrast", label: "Contrast", icon: "◐", min: -50, max: 50, step: 1, displayMultiplier: 1 },
    { key: "vibrance", label: "Vibrance", icon: "💎", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
    { key: "warmth", label: "Warmth", icon: "🔥", min: -0.5, max: 0.5, step: 0.01, displayMultiplier: 100 },
];

export default function AdjustTools() {
    const { adjustValues, setAdjustValues, resetAdjustValues } = useEditorStore();

    return (
        <div className="fade-in p-4 space-y-5">
            {sliders.map((slider) => {
                const value = adjustValues[slider.key];
                const displayValue = Math.round(value * slider.displayMultiplier);
                const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;

                return (
                    <div key={slider.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                                <span>{slider.icon}</span>
                                {slider.label}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                {displayValue > 0 ? "+" : ""}{displayValue}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={value}
                            onChange={(e) =>
                                setAdjustValues({ [slider.key]: parseFloat(e.target.value) })
                            }
                            className="slider-track w-full"
                            style={{
                                background: `linear-gradient(to right, var(--color-border) 0%, var(--color-border) ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
                            }}
                        />
                    </div>
                );
            })}

            <button
                onClick={resetAdjustValues}
                className="btn-secondary mt-2"
            >
                Reset Adjustments
            </button>
        </div>
    );
}

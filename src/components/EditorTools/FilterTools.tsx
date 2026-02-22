"use client";

import React from "react";
import { useEditorStore } from "@/lib/store";
import { filterPresets } from "@/lib/filters";

export default function FilterTools() {
    const { activeFilter, setActiveFilter, setAdjustValues } = useEditorStore();

    const handleFilterSelect = (preset: (typeof filterPresets)[number]) => {
        if (preset.id === "none") {
            setActiveFilter(null);
            setAdjustValues(preset.values);
        } else {
            setActiveFilter(preset.id);
            setAdjustValues(preset.values);
        }
    };

    return (
        <div className="fade-in p-4">
            <p className="text-xs text-[var(--color-text-muted)] text-center mb-4">
                Apply a filter preset to enhance your photo
            </p>

            {/* Horizontal scroll filter presets */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {filterPresets.map((preset) => {
                    const isActive =
                        preset.id === "none"
                            ? activeFilter === null
                            : activeFilter === preset.id;

                    return (
                        <button
                            key={preset.id}
                            onClick={() => handleFilterSelect(preset)}
                            className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-w-[80px] ${isActive
                                    ? "bg-[var(--color-primary-soft)] border-2 border-[var(--color-primary)] shadow-sm"
                                    : "bg-[var(--color-surface-alt)] border-2 border-transparent"
                                }`}
                        >
                            <span className="text-2xl">{preset.emoji}</span>
                            <span
                                className={`text-[10px] font-semibold leading-tight text-center ${isActive
                                        ? "text-[var(--color-primary)]"
                                        : "text-[var(--color-text-secondary)]"
                                    }`}
                            >
                                {preset.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

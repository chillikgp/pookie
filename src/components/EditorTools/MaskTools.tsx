"use client";

import React from "react";
import { useEditorStore } from "@/lib/store";

export default function MaskTools() {
    const {
        maskStrokes,
        undoMaskStroke,
        clearMaskStrokes,
        maskMode,
        setMaskMode,
        maskBrushSize,
        setMaskBrushSize,
    } = useEditorStore();

    return (
        <div className="fade-in p-4 space-y-4">
            <p className="text-xs text-[var(--color-text-muted)] text-center">
                Paint on the canvas to erase or restore parts of the baby image
            </p>

            {/* Mode toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setMaskMode("erase")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${maskMode === "erase"
                        ? "bg-[var(--color-primary)] text-white shadow-md"
                        : "bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]"
                        }`}
                >
                    ✂️ Erase
                </button>
                <button
                    onClick={() => setMaskMode("restore")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${maskMode === "restore"
                        ? "bg-[var(--color-primary)] text-white shadow-md"
                        : "bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]"
                        }`}
                >
                    🖌️ Restore
                </button>
            </div>

            {/* Brush size */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                        Brush Size
                    </span>
                    <div
                        className="rounded-full bg-[var(--color-primary)]"
                        style={{ width: maskBrushSize / 2, height: maskBrushSize / 2, minWidth: 6, minHeight: 6 }}
                    />
                </div>
                <input
                    type="range"
                    min="5"
                    max="80"
                    value={maskBrushSize}
                    onChange={(e) => setMaskBrushSize(parseInt(e.target.value))}
                    className="slider-track w-full"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={undoMaskStroke}
                    disabled={maskStrokes.length === 0}
                    className="flex-1 btn-secondary disabled:opacity-40"
                >
                    ↩ Undo
                </button>
                <button
                    onClick={clearMaskStrokes}
                    disabled={maskStrokes.length === 0}
                    className="flex-1 btn-secondary disabled:opacity-40"
                >
                    🗑 Clear All
                </button>
            </div>

            {/* Stroke count */}
            <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                {maskStrokes.length} stroke{maskStrokes.length !== 1 ? "s" : ""} applied
            </p>
        </div>
    );
}

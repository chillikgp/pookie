"use client";

import React from "react";
import { useEditorStore } from "@/lib/store";

export default function MoveTools() {
    const { resetBabyTransform, babyTransform } = useEditorStore();

    return (
        <div className="fade-in p-4 space-y-4">
            <p className="text-xs text-[var(--color-text-muted)] text-center">
                Drag, pinch, and rotate your baby photo on the canvas
            </p>

            {/* Quick info */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-[var(--color-surface-alt)] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        Position
                    </p>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {Math.round(babyTransform.x)}, {Math.round(babyTransform.y)}
                    </p>
                </div>
                <div className="bg-[var(--color-surface-alt)] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        Scale
                    </p>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {(babyTransform.scaleX * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="bg-[var(--color-surface-alt)] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        Rotation
                    </p>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {Math.round(babyTransform.rotation)}°
                    </p>
                </div>
            </div>

            {/* Reset button */}
            <button
                onClick={resetBabyTransform}
                className="btn-secondary"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Reset Position
            </button>
        </div>
    );
}

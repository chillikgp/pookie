"use client";

import React from "react";
import { useAdminStore } from "@/lib/admin/themeState";

export default function ShadowPanel() {
    const { theme, updateShadow } = useAdminStore();
    if (!theme) return null;

    const s = theme.shadow;

    return (
        <div className="p-4 space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-[#999] font-semibold">Shadow</span>
                <button
                    onClick={() => updateShadow({ enabled: !s.enabled })}
                    className={`w-10 h-5 rounded-full transition-all relative ${s.enabled ? "bg-[#ee652b]" : "bg-[#2a2a3a]"
                        }`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${s.enabled ? "left-5.5" : "left-0.5"
                        }`}
                        style={{ left: s.enabled ? "22px" : "2px" }}
                    />
                </button>
            </div>

            {s.enabled && (
                <>
                    {/* Angle — circular control visualization */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-[#999]">Angle</span>
                            <span className="text-[10px] font-mono text-[#666]">{s.angle}°</span>
                        </div>
                        {/* Circular angle display */}
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16">
                                <svg viewBox="0 0 64 64" className="w-full h-full">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="#2a2a3a" strokeWidth="1.5" />
                                    <line
                                        x1="32" y1="32"
                                        x2={32 + 24 * Math.cos((s.angle * Math.PI) / 180)}
                                        y2={32 + 24 * Math.sin((s.angle * Math.PI) / 180)}
                                        stroke="#ee652b" strokeWidth="2" strokeLinecap="round"
                                    />
                                    <circle cx="32" cy="32" r="3" fill="#ee652b" />
                                </svg>
                            </div>
                            <input type="range" min={0} max={360} step={5} value={s.angle}
                                onChange={(e) => updateShadow({ angle: parseInt(e.target.value) })}
                                className="flex-1 accent-[#ee652b]" />
                        </div>
                    </div>

                    {/* Distance */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-xs text-[#999]">Distance</span>
                            <span className="text-[10px] font-mono text-[#666]">{s.distance}px</span>
                        </div>
                        <input type="range" min={0} max={100} step={1} value={s.distance}
                            onChange={(e) => updateShadow({ distance: parseInt(e.target.value) })}
                            className="w-full accent-[#ee652b]" />
                    </div>

                    {/* Blur */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-xs text-[#999]">Blur</span>
                            <span className="text-[10px] font-mono text-[#666]">{s.blur}px</span>
                        </div>
                        <input type="range" min={0} max={100} step={1} value={s.blur}
                            onChange={(e) => updateShadow({ blur: parseInt(e.target.value) })}
                            className="w-full accent-[#ee652b]" />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-xs text-[#999]">Opacity</span>
                            <span className="text-[10px] font-mono text-[#666]">{(s.opacity * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={s.opacity}
                            onChange={(e) => updateShadow({ opacity: parseFloat(e.target.value) })}
                            className="w-full accent-[#ee652b]" />
                    </div>

                    {/* Shadow math preview */}
                    <div className="bg-[#0f0f13] rounded-lg p-3 text-[10px] text-[#555] space-y-0.5">
                        <p className="font-semibold text-[#666] mb-1">Computed Offset</p>
                        <p>offsetX: {(Math.cos((s.angle * Math.PI) / 180) * s.distance).toFixed(1)}px</p>
                        <p>offsetY: {(Math.sin((s.angle * Math.PI) / 180) * s.distance).toFixed(1)}px</p>
                    </div>
                </>
            )}
        </div>
    );
}

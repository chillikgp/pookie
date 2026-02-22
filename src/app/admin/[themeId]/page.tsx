"use client";

import React, { useEffect, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import { getAllThemes } from "@/lib/themes";
import { useAdminStore } from "@/lib/admin/themeState";
import AdminCanvasStage from "@/components/admin/AdminCanvasStage";
import PlacementPanel from "@/components/admin/PlacementPanel";
import ShadowPanel from "@/components/admin/ShadowPanel";
import LayerPanel from "@/components/admin/LayerPanel";
import AdjustPanel from "@/components/admin/AdjustPanel";
import { statusColor } from "@/lib/admin/helpers";

type Tab = "placement" | "shadow" | "layers" | "adjust";

function ThemeEditorContent() {
    const params = useParams();
    const themeId = params.themeId as string;
    const { theme, setTheme, isDirty, saveDraft, publish, archive, showGrid, showBoundingBox, showSafeArea, toggleGrid, toggleBoundingBox, toggleSafeArea } = useAdminStore();

    const [activeTab, setActiveTab] = React.useState<Tab>("placement");

    // Load theme
    useEffect(() => {
        getAllThemes().then((allThemes) => {
            const found = allThemes.find((t) => t.id === themeId);
            if (found) setTheme(found);
        });
    }, [themeId, setTheme]);

    if (!theme) {
        return (
            <div className="p-8 text-center">
                <p className="text-[#666] text-lg">Theme not found: {themeId}</p>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: "placement", label: "Placement", icon: "📐" },
        { key: "shadow", label: "Shadow", icon: "🌑" },
        { key: "layers", label: "Layers", icon: "📚" },
        { key: "adjust", label: "Adjust", icon: "🎨" },
    ];

    return (
        <div className="flex h-screen">
            {/* Canvas area */}
            <div className="flex-1 flex flex-col bg-[#0c0c10]">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-[#16161d] border-b border-[#2a2a3a]">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-white text-sm">{theme.name}</h2>
                        <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                            style={{
                                backgroundColor: statusColor(theme.status) + "20",
                                color: statusColor(theme.status),
                            }}
                        >
                            {theme.status}
                        </span>
                        <span className="text-[10px] text-[#555] font-mono">v{theme.version}</span>
                        {isDirty && <span className="text-[10px] text-amber-400 font-semibold">● Unsaved</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Overlay toggles */}
                        <button onClick={toggleBoundingBox} className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${showBoundingBox ? "bg-[#ee652b]/15 text-[#ee652b]" : "text-[#555] hover:text-white"}`}>
                            Box
                        </button>
                        <button onClick={toggleGrid} className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${showGrid ? "bg-[#ee652b]/15 text-[#ee652b]" : "text-[#555] hover:text-white"}`}>
                            Grid
                        </button>
                        <button onClick={toggleSafeArea} className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${showSafeArea ? "bg-[#ee652b]/15 text-[#ee652b]" : "text-[#555] hover:text-white"}`}>
                            Safe
                        </button>
                        <div className="w-px h-5 bg-[#2a2a3a] mx-1" />
                        {/* Save actions */}
                        <button onClick={saveDraft} className="px-3.5 py-1.5 bg-[#1e1e2a] border border-[#2a2a3a] text-white rounded-lg text-xs font-semibold hover:bg-[#252530] transition-colors">
                            Save Draft
                        </button>
                        <button onClick={publish} className="px-3.5 py-1.5 bg-[#22c55e] text-white rounded-lg text-xs font-bold hover:bg-[#16a34a] transition-colors">
                            Publish
                        </button>
                        <button onClick={archive} className="px-3.5 py-1.5 text-[#666] text-xs font-semibold hover:text-red-400 transition-colors">
                            Archive
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                    <AdminCanvasStage />
                </div>
            </div>

            {/* Right side panel */}
            <div className="w-80 bg-[#16161d] border-l border-[#2a2a3a] flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-[#2a2a3a]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-3 text-center text-xs font-semibold transition-all ${activeTab === tab.key
                                ? "text-[#ee652b] border-b-2 border-[#ee652b] bg-[#ee652b]/5"
                                : "text-[#666] hover:text-white"
                                }`}
                        >
                            <span className="block text-base mb-0.5">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "placement" && <PlacementPanel />}
                    {activeTab === "shadow" && <ShadowPanel />}
                    {activeTab === "layers" && <LayerPanel />}
                    {activeTab === "adjust" && <AdjustPanel />}
                </div>

                {/* Theme info footer */}
                <div className="p-4 border-t border-[#2a2a3a] text-[10px] text-[#444] space-y-0.5">
                    <p>Resolution: {theme.width}×{theme.height}</p>
                    <p>Layers: {theme.layers.length} • Baby Z: {theme.babyZIndex}</p>
                    {theme.lastEditedAt && <p>Edited: {new Date(theme.lastEditedAt).toLocaleString()}</p>}
                </div>
            </div>
        </div>
    );
}

export default function ThemeEditorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white/50 animate-pulse">Loading editor...</div>}>
            <ThemeEditorContent />
        </Suspense>
    );
}

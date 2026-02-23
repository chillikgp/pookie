"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { getAllThemes } from "@/lib/themes";
import { statusColor } from "@/lib/admin/helpers";
import { ThemeStatus } from "@/lib/theme/types";

function ThemeLibraryContent() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ThemeStatus | "all">("all");
    const [allThemes, setAllThemes] = useState<Awaited<ReturnType<typeof getAllThemes>>>([]);

    useEffect(() => {
        getAllThemes().then(setAllThemes);
    }, []);

    const filteredThemes = useMemo(() => {
        return allThemes.filter((t) => {
            if (statusFilter !== "all" && t.status !== statusFilter) return false;
            if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [allThemes, search, statusFilter]);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Theme Library</h1>
                    <p className="text-sm text-[#666] mt-1">{allThemes.length} themes total</p>
                </div>
                <Link
                    href="/admin/new"
                    className="px-5 py-2.5 bg-[#ee652b] text-white rounded-lg font-semibold text-sm hover:bg-[#d55520] transition-colors"
                >
                    + Create New Theme
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search themes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 max-w-sm px-4 py-2.5 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#ee652b]"
                />
                <div className="flex gap-1.5">
                    {(["all", "published", "draft", "archived"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${statusFilter === s
                                ? "bg-[#ee652b]/15 text-[#ee652b] border border-[#ee652b]/30"
                                : "bg-[#1a1a24] text-[#666] border border-[#2a2a3a] hover:text-white"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredThemes.map((theme) => {
                    const bgLayer = theme.layers.find((l) => l.zIndex === 0);
                    return (
                        <Link
                            key={theme.id}
                            href={`/admin/${theme.id}`}
                            className="group bg-[#16161d] border border-[#2a2a3a] rounded-xl overflow-hidden hover:border-[#ee652b]/40 transition-all"
                        >
                            {/* Thumbnail */}
                            <div className="aspect-square bg-[#1a1a24] relative overflow-hidden">
                                {bgLayer && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={bgLayer.previewUrl}
                                        alt={theme.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                )}
                                {/* Status badge */}
                                <div
                                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                    style={{
                                        backgroundColor: statusColor(theme.status) + "20",
                                        color: statusColor(theme.status),
                                    }}
                                >
                                    {theme.status}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-white text-sm">{theme.name}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] text-[#666]">{theme.collection}</span>
                                    <span className="text-[10px] text-[#555] font-mono">v{theme.version}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-[#555]">
                                        {theme.width}×{theme.height}
                                    </span>
                                    <span className="text-[10px] text-[#555]">
                                        {theme.layers.length} layer{theme.layers.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {filteredThemes.length === 0 && (
                <div className="text-center py-16 text-[#555]">
                    <p className="text-lg">No themes found</p>
                    <p className="text-sm mt-2">Try adjusting your filters or create a new theme</p>
                </div>
            )}
        </div>
    );
}

export default function AdminLibraryPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white/50 animate-pulse">Loading library...</div>}>
            <ThemeLibraryContent />
        </Suspense>
    );
}

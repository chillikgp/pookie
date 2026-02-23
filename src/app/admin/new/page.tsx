"use client";

import React, { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
    Theme,
    DEFAULT_BABY_PLACEMENT,
    DEFAULT_SHADOW,
    DEFAULT_ADJUST,
} from "@/lib/theme/types";
import { generateThemeId, detectImageDimensions, fileToDataUrl } from "@/lib/admin/helpers";
import { saveNewAdminTheme } from "@/lib/themes.admin";

function NewThemeContent() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [collection, setCollection] = useState("");
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [midFile, setMidFile] = useState<File | null>(null);
    const [fgFile, setFgFile] = useState<File | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const dims = await detectImageDimensions(file);
            setDimensions(dims);
            setBgFile(file);
            const preview = await fileToDataUrl(file);
            setBgPreview(preview);
            setError(null);
        } catch {
            setError("Failed to read background image");
        }
    }, []);

    const handleMidUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMidFile(e.target.files?.[0] || null);
    }, []);

    const handleFgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFgFile(e.target.files?.[0] || null);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) { setError("Name is required"); return; }
        if (!bgFile || !dimensions) { setError("Background image is required"); return; }

        setSubmitting(true);
        setError(null);

        try {
            const id = generateThemeId(name);

            // Build layers — for now, use data URLs (in-memory)
            // In production, these would upload to /public/themes/<id>/
            const bgDataUrl = await fileToDataUrl(bgFile);
            const layers: Theme["layers"] = [
                { previewUrl: bgDataUrl, exportUrl: bgDataUrl, zIndex: 0 },
            ];

            if (midFile) {
                const midDataUrl = await fileToDataUrl(midFile);
                layers.push({ previewUrl: midDataUrl, exportUrl: midDataUrl, zIndex: 1 });
            }
            if (fgFile) {
                const fgDataUrl = await fileToDataUrl(fgFile);
                layers.push({ previewUrl: fgDataUrl, exportUrl: fgDataUrl, zIndex: 3 });
            }

            const newTheme: Theme = {
                id,
                name: name.trim(),
                collection: collection.trim() || "Uncategorized",
                version: 1,
                status: "draft",
                width: dimensions.width,
                height: dimensions.height,
                babyPlacement: { ...DEFAULT_BABY_PLACEMENT },
                babyZIndex: 2,
                shadow: { ...DEFAULT_SHADOW },
                defaultAdjust: { ...DEFAULT_ADJUST },
                layers,
                lastEditedAt: new Date().toISOString(),
            };

            await saveNewAdminTheme(newTheme);
            router.push(`/admin/${id}`);
        } catch {
            setError("Failed to create theme");
            setSubmitting(false);
        }
    }, [name, collection, bgFile, midFile, fgFile, dimensions, router]);

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-2">Create New Theme</h1>
            <p className="text-sm text-[#666] mb-8">Upload layers and set initial metadata</p>

            <div className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-[#999] mb-2 uppercase tracking-wide">Theme Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Royal Garden"
                        className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg text-white placeholder:text-[#444] focus:outline-none focus:border-[#ee652b]"
                    />
                    {name && (
                        <p className="text-[10px] text-[#555] mt-1">
                            ID: <span className="font-mono text-[#666]">{generateThemeId(name)}</span>
                        </p>
                    )}
                </div>

                {/* Collection */}
                <div>
                    <label className="block text-xs font-semibold text-[#999] mb-2 uppercase tracking-wide">Collection</label>
                    <input
                        type="text"
                        value={collection}
                        onChange={(e) => setCollection(e.target.value)}
                        placeholder="e.g. Floral, Festival, Outdoor"
                        className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg text-white placeholder:text-[#444] focus:outline-none focus:border-[#ee652b]"
                    />
                </div>

                {/* Background Upload */}
                <div>
                    <label className="block text-xs font-semibold text-[#999] mb-2 uppercase tracking-wide">
                        Background Layer <span className="text-red-400">*</span>
                    </label>
                    <label className="block cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                        <div className="border-2 border-dashed border-[#2a2a3a] rounded-xl p-6 text-center hover:border-[#ee652b]/40 transition-colors">
                            {bgPreview ? (
                                <div className="space-y-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={bgPreview} alt="Background" className="max-h-40 mx-auto rounded-lg" />
                                    <p className="text-xs text-[#666]">
                                        {dimensions?.width}×{dimensions?.height}px (Locked)
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-[#666] text-sm">Drop or click to upload</p>
                                    <p className="text-[10px] text-[#444] mt-1">PNG, JPG, WebP</p>
                                </div>
                            )}
                        </div>
                    </label>
                </div>

                {/* Mid Layer */}
                <div>
                    <label className="block text-xs font-semibold text-[#999] mb-2 uppercase tracking-wide">
                        Mid Layer <span className="text-[#555]">(optional)</span>
                    </label>
                    <label className="block cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleMidUpload} className="hidden" />
                        <div className="border border-dashed border-[#2a2a3a] rounded-xl p-4 text-center hover:border-[#ee652b]/40 transition-colors">
                            <p className="text-[#555] text-xs">{midFile ? midFile.name : "Click to upload"}</p>
                        </div>
                    </label>
                </div>

                {/* Foreground Layer */}
                <div>
                    <label className="block text-xs font-semibold text-[#999] mb-2 uppercase tracking-wide">
                        Foreground Layer <span className="text-[#555]">(optional)</span>
                    </label>
                    <label className="block cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleFgUpload} className="hidden" />
                        <div className="border border-dashed border-[#2a2a3a] rounded-xl p-4 text-center hover:border-[#ee652b]/40 transition-colors">
                            <p className="text-[#555] text-xs">{fgFile ? fgFile.name : "Click to upload"}</p>
                        </div>
                    </label>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !name || !bgFile}
                    className="w-full py-3.5 bg-[#ee652b] text-white rounded-lg font-semibold text-sm hover:bg-[#d55520] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {submitting ? "Creating..." : "Create Theme & Open Editor"}
                </button>
            </div>
        </div>
    );
}

export default function NewThemePage() {
    return (
        <Suspense fallback={<div className="p-8 text-white/50 animate-pulse">Loading...</div>}>
            <NewThemeContent />
        </Suspense>
    );
}

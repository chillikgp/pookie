"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileLayout from "@/components/MobileLayout";
import TopBar from "@/components/TopBar";
import { useEditorStore } from "@/lib/store";
import { getThemeById } from "@/lib/themes";
import { loadAndScaleImage, isValidImageType, getStoredPhotos, savePhoto } from "@/lib/imageUtils";

function PhotoContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const themeId = searchParams.get("themeId");

    const { selectedTheme, setSelectedTheme, setOriginalBabyImageUrl } = useEditorStore();
    const [storedPhotos, setStoredPhotos] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Recover theme from URL if Zustand was lost
    useEffect(() => {
        if (!selectedTheme && themeId) {
            getThemeById(themeId).then((theme) => {
                if (theme) setSelectedTheme(theme);
            });
        }
    }, [selectedTheme, themeId, setSelectedTheme]);

    // Load stored photos
    useEffect(() => {
        setStoredPhotos(getStoredPhotos());
    }, []);

    const handleFileUpload = useCallback(
        async (file: File) => {
            setError(null);

            if (!isValidImageType(file)) {
                setError("Unsupported format. Please use JPG, PNG, or WebP.");
                return;
            }

            try {
                const scaledDataUrl = await loadAndScaleImage(file, 2000);
                savePhoto(scaledDataUrl);
                setOriginalBabyImageUrl(scaledDataUrl);
                router.push(`/processing?themeId=${themeId}`);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load image. Please try again."
                );
            }
        },
        [router, themeId, setOriginalBabyImageUrl]
    );

    const handlePhotoSelect = (dataUrl: string) => {
        setOriginalBabyImageUrl(dataUrl);
        router.push(`/processing?themeId=${themeId}`);
    };

    const themeName = selectedTheme?.name || "Selected Theme";

    return (
        <MobileLayout>
            <TopBar title="Choose Photo" showBack />

            <main className="flex-grow pb-8 fade-in">
                {/* Selected theme banner */}
                <div className="bg-[var(--color-primary-soft)] rounded-2xl p-4 mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
                        <span>🎨</span>
                    </div>
                    <div>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                            Theme selected
                        </p>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {themeName}
                        </p>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mt-4">
                        {error}
                    </div>
                )}

                {/* Upload buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <label className="card flex flex-col items-center gap-2 p-6 cursor-pointer hover:shadow-md transition-shadow">
                        <span className="text-3xl">📷</span>
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            Camera
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                        />
                    </label>

                    <label className="card flex flex-col items-center gap-2 p-6 cursor-pointer hover:shadow-md transition-shadow">
                        <span className="text-3xl">🖼️</span>
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            Gallery
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                        />
                    </label>
                </div>

                {/* Recent photos */}
                {storedPhotos.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">
                            Recent Photos
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {storedPhotos.map((photo, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePhotoSelect(photo)}
                                    className="aspect-square rounded-2xl overflow-hidden card hover:shadow-md transition-all active:scale-95"
                                >
                                    <img
                                        src={photo}
                                        alt={`Recent photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {storedPhotos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <span className="text-5xl mb-4 opacity-60">📸</span>
                        <p className="text-sm text-[var(--color-text-muted)] max-w-[220px]">
                            Upload your first baby photo using Camera or Gallery above
                        </p>
                    </div>
                )}
            </main>
        </MobileLayout>
    );
}

export default function PhotoPage() {
    return (
        <Suspense
            fallback={
                <MobileLayout>
                    <div className="flex-grow flex items-center justify-center">
                        <div className="loading-pulse text-[var(--color-text-muted)]">Loading...</div>
                    </div>
                </MobileLayout>
            }
        >
            <PhotoContent />
        </Suspense>
    );
}

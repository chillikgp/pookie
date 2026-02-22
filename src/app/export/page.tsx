"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileLayout from "@/components/MobileLayout";
import TopBar from "@/components/TopBar";
import { useEditorStore } from "@/lib/store";
import { getThemeById } from "@/lib/themes";
import { renderToCanvas } from "@/lib/renderer";

function ExportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const themeId = searchParams.get("themeId");

    const {
        selectedTheme,
        setSelectedTheme,
        processedBabyImageUrl,
        babyTransform,
        adjustValues,
        maskStrokes,
        exportedImageUrl,
        setExportedImageUrl,
        resetAll,
        editorStageWidth,
    } = useEditorStore();

    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Recover theme from URL
    useEffect(() => {
        if (!selectedTheme && themeId) {
            getThemeById(themeId).then((theme) => {
                if (theme) setSelectedTheme(theme);
            });
        }
    }, [selectedTheme, themeId, setSelectedTheme]);

    // Render full resolution on mount
    useEffect(() => {
        if (!selectedTheme || !processedBabyImageUrl || exportedImageUrl) return;

        const render = async () => {
            setIsRendering(true);
            try {
                const aspect = selectedTheme.height / selectedTheme.width;
                const editorHeight = Math.round(editorStageWidth * aspect);

                const dataUrl = await renderToCanvas({
                    theme: selectedTheme,
                    babyImageUrl: processedBabyImageUrl,
                    babyTransform,
                    adjustValues,
                    maskStrokes,
                    mode: "export",
                    stageWidth: editorStageWidth,
                    stageHeight: editorHeight,
                });
                setExportedImageUrl(dataUrl);
            } catch {
                setError("Failed to render. Please go back and try again.");
            } finally {
                setIsRendering(false);
            }
        };

        render();
    }, [
        selectedTheme,
        processedBabyImageUrl,
        babyTransform,
        adjustValues,
        maskStrokes,
        exportedImageUrl,
        setExportedImageUrl,
    ]);

    // Calculate final export dimensions for UI display
    const MAX_EXPORT_DIMENSION = 2048;
    const themeW = selectedTheme?.width || 0;
    const themeH = selectedTheme?.height || 0;
    const scaleFactor = Math.min(1, MAX_EXPORT_DIMENSION / Math.max(themeW || 1, themeH || 1));
    const exportWidth = Math.round(themeW * scaleFactor);
    const exportHeight = Math.round(themeH * scaleFactor);

    const handleDownload = () => {
        if (!exportedImageUrl) return;
        const link = document.createElement("a");
        link.download = `melababu-${selectedTheme?.id || "photo"}-${Date.now()}.jpg`;
        link.href = exportedImageUrl;
        link.click();
    };

    const handleCreateAnother = () => {
        resetAll();
        router.push("/");
    };

    return (
        <MobileLayout>
            <TopBar title="Export" showBack />

            <main className="flex-grow flex flex-col items-center pb-8 fade-in">
                {/* Preview */}
                <div className="w-full mt-4 mb-6">
                    <div className="card overflow-hidden">
                        {isRendering ? (
                            <div className="aspect-[3/4] flex flex-col items-center justify-center bg-[var(--color-surface-alt)]">
                                <div className="loading-pulse mb-4">
                                    <span className="text-4xl">🖼️</span>
                                </div>
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    Rendering studio quality...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="aspect-[3/4] flex flex-col items-center justify-center bg-[var(--color-surface-alt)] p-6 text-center">
                                <span className="text-4xl mb-4">❌</span>
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        ) : exportedImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={exportedImageUrl}
                                alt="Exported baby photo"
                                className="w-full"
                            />
                        ) : (
                            <div className="aspect-[3/4] bg-[var(--color-surface-alt)]" />
                        )}
                    </div>
                </div>

                {/* Info */}
                {exportedImageUrl && (
                    <div className="w-full space-y-3 mb-6">
                        <div className="bg-[var(--color-primary-soft)] rounded-2xl p-4 flex items-center gap-3">
                            <span className="text-xl">✅</span>
                            <div>
                                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                                    Ready to download!
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    Resolution: {exportWidth} × {exportHeight}px • JPEG
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="w-full space-y-3">
                    <button
                        onClick={handleDownload}
                        disabled={!exportedImageUrl || isRendering}
                        className="btn-primary disabled:opacity-40"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download JPEG
                    </button>

                    <button
                        onClick={handleCreateAnother}
                        className="btn-secondary"
                    >
                        ✨ Create Another
                    </button>
                </div>
            </main>
        </MobileLayout>
    );
}

export default function ExportPage() {
    return (
        <Suspense
            fallback={
                <MobileLayout>
                    <div className="flex-grow flex items-center justify-center">
                        <div className="loading-pulse text-[var(--color-text-muted)]">Preparing export...</div>
                    </div>
                </MobileLayout>
            }
        >
            <ExportContent />
        </Suspense>
    );
}

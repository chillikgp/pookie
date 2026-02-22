"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import MobileLayout from "@/components/MobileLayout";
import TopBar from "@/components/TopBar";
import BottomTabs from "@/components/BottomTabs";
import { useEditorStore } from "@/lib/store";
import { getThemeById } from "@/lib/themes";

// Dynamically import CanvasStage (uses Konva which needs window)
const CanvasStage = dynamic(() => import("@/components/CanvasStage"), {
    ssr: false,
    loading: () => (
        <div className="aspect-[3/4] bg-[var(--color-surface-alt)] rounded-2xl flex items-center justify-center">
            <div className="loading-pulse text-[var(--color-text-muted)] text-sm">
                Loading canvas...
            </div>
        </div>
    ),
});

// Dynamically import tool panels
const MoveTools = dynamic(() => import("@/components/EditorTools/MoveTools"), { ssr: false });
const AdjustTools = dynamic(() => import("@/components/EditorTools/AdjustTools"), { ssr: false });
const FilterTools = dynamic(() => import("@/components/EditorTools/FilterTools"), { ssr: false });

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const themeId = searchParams.get("themeId");
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const {
        selectedTheme,
        setSelectedTheme,
        processedBabyImageUrl,
        activeTab,
        setActiveTab,
        clearProcessedImage,
    } = useEditorStore();

    // Recover theme from URL if Zustand was lost
    useEffect(() => {
        if (!selectedTheme && themeId) {
            getThemeById(themeId).then((theme) => {
                if (theme) setSelectedTheme(theme);
            });
        }
    }, [selectedTheme, themeId, setSelectedTheme]);

    // Measure container width for canvas sizing
    useEffect(() => {
        const measure = () => {
            if (canvasContainerRef.current) {
                setContainerWidth(canvasContainerRef.current.offsetWidth);
            }
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    // Redirect if no image
    useEffect(() => {
        if (!processedBabyImageUrl && !selectedTheme) {
            const timeout = setTimeout(() => {
                if (!useEditorStore.getState().processedBabyImageUrl) {
                    router.push("/");
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [processedBabyImageUrl, selectedTheme, router]);

    // Back button: clear processed image, go to photo page (NOT processing)
    const handleBack = () => {
        clearProcessedImage();
        router.push(`/photo?themeId=${themeId}`);
    };

    const renderToolPanel = () => {
        switch (activeTab) {
            case "move":
                return <MoveTools />;
            case "adjust":
                return <AdjustTools />;
            case "filters":
                return <FilterTools />;
            default:
                return <MoveTools />;
        }
    };

    return (
        <MobileLayout noPadding>
            <div className="px-5">
                <TopBar
                    title={selectedTheme?.name || "Editor"}
                    showBack
                    onBack={handleBack}
                    rightAction={
                        <button
                            onClick={() => router.push(`/export?themeId=${themeId}`)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-primary)] text-white"
                            aria-label="Export"
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
                        </button>
                    }
                />
            </div>

            {/* Canvas area */}
            <div
                ref={canvasContainerRef}
                className="flex-grow flex items-start justify-center px-3 py-3 bg-[var(--color-surface-alt)]"
            >
                {containerWidth > 0 && <CanvasStage containerWidth={containerWidth - 24} />}
            </div>

            {/* Tool panel */}
            <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] max-h-[35vh] overflow-y-auto">
                {renderToolPanel()}
            </div>

            {/* Bottom tabs */}
            <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </MobileLayout>
    );
}

export default function EditorPage() {
    return (
        <Suspense
            fallback={
                <MobileLayout>
                    <div className="flex-grow flex items-center justify-center">
                        <div className="loading-pulse text-[var(--color-text-muted)]">Loading editor...</div>
                    </div>
                </MobileLayout>
            }
        >
            <EditorContent />
        </Suspense>
    );
}

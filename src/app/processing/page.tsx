"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileLayout from "@/components/MobileLayout";
import { useEditorStore } from "@/lib/store";
import { getThemeById } from "@/lib/themes";
import { removeBackground } from "@/lib/backgroundRemoval";

function ProcessingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const themeId = searchParams.get("themeId");

    const {
        selectedTheme,
        setSelectedTheme,
        originalBabyImageUrl,
        processedBabyImageUrl,
        setProcessedBabyImageUrl,
        setProcessing,
    } = useEditorStore();

    const [status, setStatus] = useState("Preparing your baby photo...");
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const hasStarted = useRef(false);

    // Recover theme from URL if Zustand was lost
    useEffect(() => {
        if (!selectedTheme && themeId) {
            getThemeById(themeId).then((theme) => {
                if (theme) setSelectedTheme(theme);
            });
        }
    }, [selectedTheme, themeId, setSelectedTheme]);

    // SKIP: if processedBabyImageUrl already exists, go straight to editor
    useEffect(() => {
        if (processedBabyImageUrl) {
            router.replace(`/editor?themeId=${themeId}`);
        }
    }, [processedBabyImageUrl, router, themeId]);

    // Run background removal
    useEffect(() => {
        if (hasStarted.current) return;
        // Don't process if already processed
        if (processedBabyImageUrl) return;
        if (!originalBabyImageUrl) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError("No photo selected. Please go back and choose a photo.");
            return;
        }

        hasStarted.current = true;
        setProcessing(true, "Removing background...");

        // Progress animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 10;
            });
        }, 800);

        // Timeout guard — show message if >15s (real inference can take time)
        const timeoutId = setTimeout(() => {
            setStatus("Still working… loading AI model");
        }, 15000);

        const process = async () => {
            try {
                setStatus("Loading AI model & removing background...");
                const result = await removeBackground(originalBabyImageUrl);

                clearTimeout(timeoutId);
                clearInterval(progressInterval);

                if (!result.success || !result.imageUrl) {
                    setError(result.error || "Background removal failed. Please try again.");
                    setProcessing(false);
                    return;
                }

                setProgress(100);
                setStatus("Optimizing size...");

                // 🚨 PHASE 3 MOBILE MEMORY OPTIMIZATION: 
                // Downscale for preview performance to guarantee iOS Safari doesn't crash on rotation.
                // The export pipeline max is 2048, but the preview only needs a fraction of that visually.
                const MAX_PREVIEW_DIMENSION = 1200;
                const finalUrl = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        if (img.width <= MAX_PREVIEW_DIMENSION && img.height <= MAX_PREVIEW_DIMENSION) {
                            resolve(result.imageUrl as string);
                            return;
                        }
                        const scale = MAX_PREVIEW_DIMENSION / Math.max(img.width, img.height);
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL("image/png"));
                        } else {
                            resolve(result.imageUrl as string); // fallback
                        }
                    };
                    img.onerror = () => resolve(result.imageUrl as string);
                    img.src = result.imageUrl as string;
                });

                setStatus("Done!");
                setProcessedBabyImageUrl(finalUrl);
                setProcessing(false);

                // Brief pause to show completion
                setTimeout(() => {
                    router.push(`/editor?themeId=${themeId}`);
                }, 300);
            } catch {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
                setError("Something went wrong. Please try again.");
                setProcessing(false);
            }
        };

        process();

        return () => {
            clearTimeout(timeoutId);
            clearInterval(progressInterval);
        };
    }, [
        originalBabyImageUrl,
        processedBabyImageUrl,
        setProcessedBabyImageUrl,
        setProcessing,
        router,
        themeId,
    ]);

    return (
        <MobileLayout>
            <main className="flex-grow flex flex-col items-center justify-center py-16">
                {/* Blurred theme background */}
                <div
                    className="absolute inset-0 opacity-20 blur-3xl"
                    style={{
                        background: selectedTheme
                            ? "linear-gradient(135deg, #fce4ec, #f8bbd0, #c5cae9)"
                            : "linear-gradient(135deg, #f5f5f5, #e0e0e0)",
                    }}
                />

                <div className="relative z-10 flex flex-col items-center text-center px-8">
                    {error ? (
                        <>
                            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-6">
                                <span className="text-4xl">❌</span>
                            </div>
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                                Processing Failed
                            </h2>
                            <p className="text-sm text-red-500 mb-6">{error}</p>
                            <button
                                onClick={() => router.back()}
                                className="btn-primary max-w-[200px]"
                            >
                                Try Again
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Animated loader */}
                            <div className="relative w-24 h-24 mb-8">
                                <div className="absolute inset-0 rounded-3xl bg-[var(--color-primary-soft)] loading-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl">👶</span>
                                </div>
                            </div>

                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                                {status}
                            </h2>
                            <p className="text-xs text-[var(--color-text-muted)] mb-6">
                                AI is working its magic on your photo
                            </p>

                            {/* Progress bar */}
                            <div className="w-full max-w-[250px] h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>
        </MobileLayout>
    );
}

export default function ProcessingPage() {
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
            <ProcessingContent />
        </Suspense>
    );
}

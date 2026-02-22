"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MobileLayout from "@/components/MobileLayout";
import TopBar from "@/components/TopBar";
import ThemeCard from "@/components/ThemeCard";
import { getPublishedThemes, getCollections, Theme } from "@/lib/themes";
import { useEditorStore } from "@/lib/store";

export default function ThemePage() {
    const router = useRouter();
    const [activeCollection, setActiveCollection] = useState<string>("All");
    const setSelectedTheme = useEditorStore((s) => s.setSelectedTheme);

    const [publishedThemes, setPublishedThemes] = useState<Theme[]>([]);
    const [allCollections, setAllCollections] = useState<string[]>([]);

    useEffect(() => {
        getPublishedThemes().then((t) => setPublishedThemes([...t].reverse()));
        getCollections().then(setAllCollections);
    }, []);

    const filteredThemes =
        activeCollection === "All"
            ? publishedThemes
            : publishedThemes.filter((t) => t.collection === activeCollection);

    const handleThemeSelect = (theme: Theme) => {
        setSelectedTheme(theme);
        router.push(`/photo?themeId=${theme.id}`);
    };

    return (
        <MobileLayout>
            <TopBar title="Choose Theme" showBack />

            <main className="flex-grow pb-8 fade-in">
                {/* Category chips */}
                <div className="flex gap-2 overflow-x-auto py-4 -mx-5 px-5 scrollbar-hide">
                    <button
                        onClick={() => setActiveCollection("All")}
                        className={`chip ${activeCollection === "All" ? "chip-active" : ""}`}
                    >
                        ✨ All
                    </button>
                    {allCollections.map((collection) => (
                        <button
                            key={collection}
                            onClick={() => setActiveCollection(collection)}
                            className={`chip ${activeCollection === collection ? "chip-active" : ""
                                }`}
                        >
                            {collection}
                        </button>
                    ))}
                </div>

                {/* Theme grid */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {filteredThemes.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            onClick={() => handleThemeSelect(theme)}
                        />
                    ))}
                </div>

                {filteredThemes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="text-4xl mb-3">🎭</span>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            No themes in this collection yet
                        </p>
                    </div>
                )}
            </main>
        </MobileLayout>
    );
}

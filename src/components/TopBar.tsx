"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface TopBarProps {
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export default function TopBar({
    title = "MelaBabu",
    showBack = false,
    onBack,
    rightAction,
}: TopBarProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-md py-3 flex items-center justify-between border-b border-[var(--color-border-light)]">
            <div className="w-10">
                {showBack && (
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--color-primary-soft)] transition-colors"
                        aria-label="Go back"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                    {title}
                </span>
            </div>
            <div className="w-10 flex items-center justify-center">
                {rightAction || <div className="w-10" />}
            </div>
        </header>
    );
}

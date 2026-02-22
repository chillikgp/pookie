"use client";

import React from "react";

interface MobileLayoutProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export default function MobileLayout({
    children,
    className = "",
    noPadding = false,
}: MobileLayoutProps) {
    return (
        <div className="min-h-screen bg-[var(--color-background)] flex justify-center">
            <div
                className={`relative w-full max-w-[420px] min-h-screen flex flex-col ${noPadding ? "" : "px-5"
                    } ${className}`}
            >
                {children}
            </div>
        </div>
    );
}

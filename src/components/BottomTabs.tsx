"use client";

import React from "react";

export type EditorTab = "move" | "adjust" | "mask" | "filters";

interface TabConfig {
    id: EditorTab;
    label: string;
    icon: React.ReactNode;
}

const tabs: TabConfig[] = [
    {
        id: "move",
        label: "Move",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 9l-3 3 3 3" /><path d="M9 5l3-3 3 3" /><path d="M15 19l-3 3-3-3" /><path d="M19 9l3 3-3 3" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
            </svg>
        ),
    },
    {
        id: "adjust",
        label: "Adjust",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
        ),
    },
    {
        id: "mask",
        label: "Mask",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 12s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
        ),
    },
    {
        id: "filters",
        label: "Filters",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
        ),
    },
];

interface BottomTabsProps {
    activeTab: EditorTab;
    onTabChange: (tab: EditorTab) => void;
}

export default function BottomTabs({ activeTab, onTabChange }: BottomTabsProps) {
    return (
        <div className="flex items-center justify-around bg-[var(--color-surface)] border-t border-[var(--color-border)] py-2">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${isActive
                                ? "text-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            }`}
                    >
                        {tab.icon}
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

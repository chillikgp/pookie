"use client";

import React, { ReactNode, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadAdminOverrides } from "@/lib/themes.admin";

interface AdminLayoutProps {
    children: ReactNode;
}

const navItems = [
    { href: "/admin", label: "Theme Library", icon: "🎨" },
    { href: "/admin/new", label: "New Theme", icon: "➕" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const [bakeStatus, setBakeStatus] = useState<string | null>(null);

    const handleBake = useCallback(async () => {
        const overrides = loadAdminOverrides();
        if (overrides.length === 0) {
            setBakeStatus("No overrides to bake");
            setTimeout(() => setBakeStatus(null), 3000);
            return;
        }

        setBakeStatus("Resolving images...");

        // Resolve idb:// URLs from IndexedDB so the server can write them to disk
        const resolved = await Promise.all(
            overrides.map(async (override) => {
                if (!override.layers) return override;
                const layers = await Promise.all(
                    override.layers.map(async (layer) => {
                        if (layer.url.startsWith("idb://")) {
                            const key = layer.url.replace("idb://", "");
                            const match = key.match(/^(.+)__layer_(\d+)$/);
                            if (match) {
                                const { loadLayerImage } = await import("@/lib/admin/imageStore");
                                const dataUrl = await loadLayerImage(match[1], parseInt(match[2]));
                                return { ...layer, dataUrl: dataUrl || undefined };
                            }
                        }
                        // For regular URLs (e.g., /themes/foo/background.png), no dataUrl needed
                        return layer;
                    })
                );
                return { ...override, layers };
            })
        );

        setBakeStatus("Baking...");
        try {
            const res = await fetch("/api/admin/bake-overrides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ overrides: resolved }),
            });
            const data = await res.json();
            if (data.success) {
                const parts = [`✅ Baked ${data.patched} theme(s)`];
                if (data.imagesWritten > 0) parts.push(`${data.imagesWritten} image(s) saved`);
                if (data.regenerated) parts.push("regenerated");
                setBakeStatus(parts.join(", "));
            } else {
                setBakeStatus(`❌ ${data.error}`);
            }
        } catch (err) {
            setBakeStatus(`❌ ${err}`);
        }
        setTimeout(() => setBakeStatus(null), 5000);
    }, []);

    return (
        <div className="min-h-screen bg-[#0f0f13] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#16161d] border-r border-[#2a2a3a] flex flex-col">
                <div className="p-6 border-b border-[#2a2a3a]">
                    <h1 className="text-lg font-bold tracking-tight">
                        <span className="text-[#ee652b]">MelaBabu</span> Studio
                    </h1>
                    <p className="text-xs text-[#666] mt-1">Theme Admin</p>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? "bg-[#ee652b]/15 text-[#ee652b]"
                                    : "text-[#999] hover:bg-[#1e1e2a] hover:text-white"
                                    }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bake overrides to code */}
                <div className="p-3 border-t border-[#2a2a3a]">
                    <button
                        onClick={handleBake}
                        className="w-full px-4 py-2.5 bg-[#1e1e2a] border border-[#2a2a3a] rounded-lg text-xs font-semibold text-[#999] hover:text-white hover:border-[#ee652b]/40 transition-all flex items-center gap-2 justify-center"
                    >
                        <span>📦</span>
                        Bake Overrides to Code
                    </button>
                    {bakeStatus && (
                        <p className="text-[10px] text-center mt-2 text-[#888]">{bakeStatus}</p>
                    )}
                </div>

                <div className="p-4 border-t border-[#2a2a3a] text-[10px] text-[#555]">
                    Admin Studio v1.0
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}


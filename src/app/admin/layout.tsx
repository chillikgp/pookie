"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

/**
 * Inner component that uses useSearchParams — must be inside Suspense.
 */
function AdminGate({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const key = searchParams.get("key");
        const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET;

        // In development with no secret set, allow access
        if (!secret) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAuthorized(true);
            return;
        }

        if (key === secret) {
            sessionStorage.setItem("admin_key", key);
            setAuthorized(true);
        } else if (sessionStorage.getItem("admin_key") === secret) {
            setAuthorized(true);
        } else {
            setAuthorized(false);
            router.replace("/");
        }
    }, [searchParams, router]);

    if (authorized === null) {
        return (
            <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
                <div className="text-white/50 animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!authorized) return null;

    return <AdminLayout>{children}</AdminLayout>;
}

/**
 * Admin route group layout.
 * Wraps children in auth gate (Suspense-safe).
 */
export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
                    <div className="text-white/50 animate-pulse">Loading admin...</div>
                </div>
            }
        >
            <AdminGate>{children}</AdminGate>
        </Suspense>
    );
}

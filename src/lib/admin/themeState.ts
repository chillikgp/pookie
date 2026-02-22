/**
 * Admin Zustand store — manages theme being edited.
 *
 * Completely isolated from consumer store.
 * Persists edits via themes.admin.ts (localStorage).
 */

import { create } from "zustand";
import {
    Theme,
    ThemeBabyPlacement,
    ThemeShadow,
    ThemeDefaultAdjust,
    ThemeLayer,
    ThemeStatus,
    DEFAULT_BABY_PLACEMENT,
    DEFAULT_SHADOW,
    DEFAULT_ADJUST,
} from "@/lib/theme/types";
import { saveThemeOverride } from "@/lib/themes.admin";

export interface AdminEditorState {
    /** Theme currently being edited */
    theme: Theme | null;
    setTheme: (theme: Theme) => void;

    /** Dirty flag — unsaved changes exist */
    isDirty: boolean;

    /** Selected dummy baby URL */
    dummyBabyUrl: string;
    setDummyBabyUrl: (url: string) => void;

    /** Show overlays */
    showGrid: boolean;
    showBoundingBox: boolean;
    showSafeArea: boolean;
    toggleGrid: () => void;
    toggleBoundingBox: () => void;
    toggleSafeArea: () => void;

    // ─── Theme property updaters ───────────────────────────────
    updatePlacement: (placement: Partial<ThemeBabyPlacement>) => void;
    updateShadow: (shadow: Partial<ThemeShadow>) => void;
    updateDefaultAdjust: (adjust: Partial<ThemeDefaultAdjust>) => void;
    updateBabyZIndex: (zIndex: number) => void;
    updateLayers: (layers: ThemeLayer[]) => void;
    updateName: (name: string) => void;
    updateCollection: (collection: string) => void;

    // ─── Save actions ──────────────────────────────────────────
    /** Save draft — no version bump */
    saveDraft: () => void;
    /** Publish — increment version */
    publish: () => void;
    /** Archive */
    archive: () => void;
}

export const DUMMY_BABIES = [
    { url: "/dummy/baby1.png", name: "Baby 1" },
    { url: "/dummy/baby2.png", name: "Baby 2" },
    { url: "/dummy/baby3.png", name: "Baby 3" },
];

export const useAdminStore = create<AdminEditorState>((set, get) => ({
    theme: null,
    setTheme: (theme) => set({ theme, isDirty: false }),
    isDirty: false,

    dummyBabyUrl: DUMMY_BABIES[0].url,
    setDummyBabyUrl: (url) => set({ dummyBabyUrl: url }),

    showGrid: false,
    showBoundingBox: true,
    showSafeArea: false,
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleBoundingBox: () => set((s) => ({ showBoundingBox: !s.showBoundingBox })),
    toggleSafeArea: () => set((s) => ({ showSafeArea: !s.showSafeArea })),

    updatePlacement: (placement) => set((s) => {
        if (!s.theme) return s;
        return {
            isDirty: true,
            theme: {
                ...s.theme,
                babyPlacement: { ...s.theme.babyPlacement, ...placement },
                lastEditedAt: new Date().toISOString(),
            },
        };
    }),

    updateShadow: (shadow) => set((s) => {
        if (!s.theme) return s;
        return {
            isDirty: true,
            theme: {
                ...s.theme,
                shadow: { ...s.theme.shadow, ...shadow },
                lastEditedAt: new Date().toISOString(),
            },
        };
    }),

    updateDefaultAdjust: (adjust) => set((s) => {
        if (!s.theme) return s;
        return {
            isDirty: true,
            theme: {
                ...s.theme,
                defaultAdjust: { ...s.theme.defaultAdjust, ...adjust },
                lastEditedAt: new Date().toISOString(),
            },
        };
    }),

    updateBabyZIndex: (zIndex) => set((s) => {
        if (!s.theme) return s;
        return {
            isDirty: true,
            theme: { ...s.theme, babyZIndex: zIndex, lastEditedAt: new Date().toISOString() },
        };
    }),

    updateLayers: (layers) => set((s) => {
        if (!s.theme) return s;
        return {
            isDirty: true,
            theme: { ...s.theme, layers, lastEditedAt: new Date().toISOString() },
        };
    }),

    updateName: (name) => set((s) => {
        if (!s.theme) return s;
        return { isDirty: true, theme: { ...s.theme, name } };
    }),

    updateCollection: (collection) => set((s) => {
        if (!s.theme) return s;
        return { isDirty: true, theme: { ...s.theme, collection } };
    }),

    saveDraft: () => {
        const { theme } = get();
        if (!theme) return;
        const updated: Theme = {
            ...theme,
            status: theme.status === "archived" ? "draft" : theme.status,
            lastEditedAt: new Date().toISOString(),
        };
        void saveThemeOverride(updated);
        set({ theme: updated, isDirty: false });
    },

    publish: () => {
        const { theme } = get();
        if (!theme) return;
        const updated: Theme = {
            ...theme,
            status: "published",
            version: theme.version + 1,
            lastEditedAt: new Date().toISOString(),
        };
        void saveThemeOverride(updated);
        set({ theme: updated, isDirty: false });
    },

    archive: () => {
        const { theme } = get();
        if (!theme) return;
        const updated: Theme = {
            ...theme,
            status: "archived",
            lastEditedAt: new Date().toISOString(),
        };
        void saveThemeOverride(updated);
        set({ theme: updated, isDirty: false });
    },
}));

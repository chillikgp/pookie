/**
 * Admin metadata layer — editable theme overrides.
 *
 * This is NOT the generated file. It stores admin edits
 * (status, placement, shadow, defaultAdjust, layers, etc.)
 * that override values from themes.generated.ts.
 *
 * Persisted to localStorage so edits survive page reload.
 * Layer images (data URLs) are stored in IndexedDB to avoid
 * the ~5MB localStorage quota limit.
 *
 * Never touches themes.generated.ts.
 */

import { Theme } from "@/lib/theme/types";
import { saveThemeLayerImages, resolveLayerUrls } from "./admin/imageStore";

const STORAGE_KEY = "melababu_admin_themes";

/** Partial theme — only fields the admin has edited */
export type ThemeOverride = Partial<Theme> & { id: string };

/**
 * Load admin overrides from localStorage.
 */
export function loadAdminOverrides(): ThemeOverride[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Save admin overrides to localStorage.
 */
export function saveAdminOverrides(overrides: ThemeOverride[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (e) {
        console.error("[themes.admin] localStorage save failed:", e);
    }
}

/**
 * Save a single theme override (upsert).
 * If the override includes layers with data URLs, they are
 * offloaded to IndexedDB first.
 */
export async function saveThemeOverride(override: ThemeOverride): Promise<void> {
    // Offload layer images to IndexedDB if present
    let cleanOverride = override;
    if (override.layers) {
        const cleanLayers = await saveThemeLayerImages(override.id, override.layers);
        cleanOverride = { ...override, layers: cleanLayers };
    }

    const overrides = loadAdminOverrides();
    const idx = overrides.findIndex((o) => o.id === cleanOverride.id);
    if (idx >= 0) {
        overrides[idx] = { ...overrides[idx], ...cleanOverride };
    } else {
        overrides.push(cleanOverride);
    }
    saveAdminOverrides(overrides);
}

/**
 * Save a completely new admin-created theme.
 * Layer data URLs are stored in IndexedDB; only lightweight
 * metadata (with idb:// references) goes into localStorage.
 */
export async function saveNewAdminTheme(theme: Theme): Promise<void> {
    // Offload layer images to IndexedDB
    const cleanLayers = await saveThemeLayerImages(theme.id, theme.layers);
    const cleanTheme: Theme = { ...theme, layers: cleanLayers };

    const overrides = loadAdminOverrides();
    overrides.push(cleanTheme);
    saveAdminOverrides(overrides);
}

/**
 * Delete an admin override (reverts to generated values).
 */
export function deleteAdminOverride(themeId: string): void {
    const overrides = loadAdminOverrides().filter((o) => o.id !== themeId);
    saveAdminOverrides(overrides);
}

/**
 * Merge generated themes with admin overrides.
 * Admin overrides take precedence over generated values.
 * Admin-only themes (not in generated) are appended.
 * Resolves idb:// layer URLs from IndexedDB, falling back to
 * generated file URLs when IndexedDB data is missing.
 */
export async function mergeWithOverrides(
    generatedThemes: Theme[],
): Promise<Theme[]> {
    const overrides = loadAdminOverrides();
    const overrideMap = new Map<string, ThemeOverride>();
    for (const o of overrides) {
        overrideMap.set(o.id, o);
    }

    // Build a map of generated layers for fallback
    const generatedLayerMap = new Map<string, Theme["layers"]>();
    for (const t of generatedThemes) {
        generatedLayerMap.set(t.id, t.layers);
    }

    // Merge existing themes with overrides
    const merged: Theme[] = generatedThemes.map((theme) => {
        const override = overrideMap.get(theme.id);
        if (override) {
            overrideMap.delete(theme.id); // Mark as consumed
            return { ...theme, ...override } as Theme;
        }
        return theme;
    });

    // Append admin-only themes (created via /admin/new)
    for (const override of overrideMap.values()) {
        // Only include if it has enough data to be a full theme
        if (override.name && override.width && override.height && override.layers) {
            merged.push(override as Theme);
        }
    }

    // Resolve all idb:// layer URLs from IndexedDB
    const resolved = await Promise.all(
        merged.map(async (theme) => {
            const hasIdbUrls = theme.layers.some((l) => l.url.startsWith("idb://"));
            if (hasIdbUrls) {
                const fallbackLayers = generatedLayerMap.get(theme.id);
                const resolvedLayers = await resolveLayerUrls(theme.layers);
                // If any idb:// URL couldn't be resolved, fall back to generated layer URL
                const finalLayers = resolvedLayers.map((layer, i) => {
                    if (layer.url.startsWith("idb://") && fallbackLayers?.[i]) {
                        return { ...layer, url: fallbackLayers[i].url };
                    }
                    return layer;
                });
                return { ...theme, layers: finalLayers };
            }
            return theme;
        })
    );

    return resolved;
}


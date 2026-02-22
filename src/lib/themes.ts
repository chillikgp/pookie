/**
 * Theme access layer for consumer + admin.
 *
 * Merges auto-generated themes (from folder scan) with admin overrides
 * (from localStorage). Consumer only sees "published" themes.
 *
 * IMPORTANT: On the client, always use getAllThemes() or getPublishedThemes()
 * to ensure admin overrides are respected.
 */

export type { Theme } from "./theme/types";
import { Theme } from "./theme/types";
import { generatedThemes } from "./themes.generated";
import { mergeWithOverrides } from "./themes.admin";

/** All themes (merged with admin overrides). */
export async function getAllThemes(): Promise<Theme[]> {
  if (typeof window === "undefined") return generatedThemes;
  return mergeWithOverrides(generatedThemes);
}

/** Published themes only (with admin overrides applied). */
export async function getPublishedThemes(): Promise<Theme[]> {
  return (await getAllThemes()).filter((t) => t.status === "published");
}

/** Static fallback for SSR — no admin overrides (used only at build time) */
export const themes: Theme[] = generatedThemes.filter(
  (t) => t.status === "published"
);

export async function getCollections(): Promise<string[]> {
  return [...new Set((await getAllThemes()).map((t) => t.collection))];
}

/** @deprecated Use getCollections() on client side */
export const collections = [...new Set(generatedThemes.map((t) => t.collection))];

export async function getThemeById(id: string): Promise<Theme | undefined> {
  return (await getAllThemes()).find((t) => t.id === id);
}


/**
 * Canonical Theme interface — shared by consumer + admin.
 * This is the SINGLE SOURCE OF TRUTH for theme shape.
 *
 * Consumer imports this for rendering.
 * Admin imports this for editing.
 * Never duplicate this schema.
 */

export interface ThemeBabyPlacement {
    /** X position as percentage of canvas width (0-100) */
    x: number;
    /** Y position as percentage of canvas height (0-100) */
    y: number;
    /** Width as percentage of canvas width (0-100) */
    width: number;
    /** Height as percentage of canvas height (0-100) */
    height: number;
    /** Rotation in degrees */
    rotation: number;
    /** Anchor point for vertical alignment within bounding box */
    anchor: "center" | "bottom" | "top";
}

export interface ThemeShadow {
    enabled: boolean;
    /** Angle in degrees (0-360) */
    angle: number;
    /** Distance in native pixels */
    distance: number;
    /** Blur radius in native pixels */
    blur: number;
    /** Opacity (0-1) */
    opacity: number;
}

export interface ThemeDefaultAdjust {
    /** Konva brightness: -1 to 1 */
    brightness: number;
    /** Konva contrast: -100 to 100 */
    contrast: number;
    /** Konva saturation: -1 to 1 */
    vibrance: number;
    /** RGB shift: -1 to 1 */
    warmth: number;
}

export interface ThemeLayer {
    previewUrl: string;
    exportUrl: string;
    zIndex: number;
    visible?: boolean;
}

export type ThemeStatus = "draft" | "published" | "archived";

export interface Theme {
    id: string;
    name: string;
    collection: string;
    version: number;
    status: ThemeStatus;

    /** Native resolution width in pixels */
    width: number;
    /** Native resolution height in pixels */
    height: number;
    /** Optional thumbnail URL for library view */
    thumbnailUrl?: string;

    babyPlacement: ThemeBabyPlacement;
    babyZIndex: number;

    shadow: ThemeShadow;
    defaultAdjust: ThemeDefaultAdjust;

    layers: ThemeLayer[];

    /** ISO timestamp of last edit */
    lastEditedAt?: string;
}

/** Default values for creating new themes */
export const DEFAULT_BABY_PLACEMENT: ThemeBabyPlacement = {
    x: 25,
    y: 30,
    width: 50,
    height: 50,
    rotation: 0,
    anchor: "center",
};

export const DEFAULT_SHADOW: ThemeShadow = {
    enabled: false,
    angle: 120,
    distance: 20,
    blur: 40,
    opacity: 0.28,
};

export const DEFAULT_ADJUST: ThemeDefaultAdjust = {
    brightness: 0,
    contrast: 0,
    vibrance: 0,
    warmth: 0,
};

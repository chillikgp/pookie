import { Theme } from "./theme/types";

export interface ShadowOffset {
    offsetX: number;
    offsetY: number;
    blur: number;
    opacity: number;
}

/**
 * Calculate shadow offset from theme shadow configuration.
 * Uses angle in degrees and distance in pixels.
 *
 * offsetX = cos(angle) * distance
 * offsetY = sin(angle) * distance
 */
export function calculateShadowOffset(shadow: Theme["shadow"]): ShadowOffset {
    if (!shadow.enabled) {
        return { offsetX: 0, offsetY: 0, blur: 0, opacity: 0 };
    }

    const angleRad = (shadow.angle * Math.PI) / 180;

    return {
        offsetX: Math.cos(angleRad) * shadow.distance,
        offsetY: Math.sin(angleRad) * shadow.distance,
        blur: shadow.blur,
        opacity: shadow.opacity,
    };
}

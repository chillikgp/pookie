import { AdjustValues } from "./store";

export interface FilterPreset {
    id: string;
    name: string;
    emoji: string;
    values: AdjustValues;
}

/**
 * Photography-grade filter presets.
 * Values are in Konva filter units:
 *   brightness: -1 to 1 (0 = no change)
 *   contrast: -100 to 100 (0 = no change)
 *   vibrance: -1 to 1 (saturation, 0 = no change)
 *   warmth: -1 to 1 (RGB shift, 0 = no change)
 */
export const filterPresets: FilterPreset[] = [
    {
        id: "none",
        name: "Original",
        emoji: "🔄",
        values: { brightness: 0, contrast: 0, vibrance: 0, warmth: 0 },
    },
    {
        id: "studio_glow",
        name: "Studio Glow",
        emoji: "✨",
        values: { brightness: 0.05, contrast: 10, vibrance: 0.08, warmth: 0.05 },
    },
    {
        id: "warm_gold",
        name: "Warm Gold",
        emoji: "🌅",
        values: { brightness: 0.04, contrast: 8, vibrance: 0.12, warmth: 0.15 },
    },
    {
        id: "soft_pastel",
        name: "Soft Pastel",
        emoji: "🌸",
        values: { brightness: 0.07, contrast: -5, vibrance: -0.05, warmth: 0.05 },
    },
    {
        id: "cool_modern",
        name: "Cool Modern",
        emoji: "❄️",
        values: { brightness: 0.03, contrast: 12, vibrance: -0.03, warmth: -0.08 },
    },
    {
        id: "royal_rich",
        name: "Royal Rich",
        emoji: "👑",
        values: { brightness: -0.02, contrast: 18, vibrance: 0.15, warmth: 0.10 },
    },
];

/**
 * Apply adjust values to a canvas 2D context for export rendering.
 * This MUST match the Konva filter math exactly for export parity.
 *
 * Konva filter equivalents applied pixel-by-pixel:
 *  - Brighten: pixel + brightness * 255
 *  - Contrast: ((pixel / 255 - 0.5) * contrast_factor + 0.5) * 255
 *  - Saturation: HSL saturation adjustment
 *  - RGB (warmth): red *= (1 + warmth * 0.05), blue *= (1 - warmth * 0.05)
 */
export function applyFiltersToImageData(
    imageData: ImageData,
    values: AdjustValues
): void {
    const data = imageData.data;
    const brightness = values.brightness; // Konva brightness: -1 to 1
    const contrast = values.contrast;     // Konva contrast: -100 to 100
    const saturation = values.vibrance;   // mapped to saturation: -1 to 1
    const warmth = values.warmth;         // -1 to 1

    // Contrast factor: Konva uses pow(2, contrast/100) based adjustment
    const contrastFactor = contrast === 0 ? 1 : Math.max(0, (100 + contrast) / 100);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        // Skip fully transparent pixels
        if (data[i + 3] === 0) continue;

        // 1. Brightness (additive, same as Konva.Filters.Brighten)
        r += brightness * 255;
        g += brightness * 255;
        b += brightness * 255;

        // 2. Contrast (same as Konva.Filters.Contrast)
        r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

        // 3. Saturation / Vibrance (HSL-based, same as Konva.Filters.Saturation)
        if (saturation !== 0) {
            const avg = (r + g + b) / 3;
            r += (r - avg) * saturation;
            g += (g - avg) * saturation;
            b += (b - avg) * saturation;
        }

        // 4. Warmth (RGB shift)
        if (warmth !== 0) {
            r *= 1 + warmth * 0.05;
            b *= 1 - warmth * 0.05;
        }

        // Clamp
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
}

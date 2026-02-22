import { Theme } from "./themes";
import { BabyTransform } from "./store";

/**
 * Calculate initial baby placement in STAGE PIXEL coordinates.
 *
 * @param theme - The selected theme (for babyPlacement percentages)
 * @param stageWidth - The ACTUAL Konva stage width (preview pixels)
 * @param stageHeight - The ACTUAL Konva stage height (preview pixels)
 * @param babyNaturalWidth - Natural width of the baby image (pixels)
 * @param babyNaturalHeight - Natural height of the baby image (pixels)
 * @returns BabyTransform with x, y in stage pixel space
 */
export function calculateInitialPlacement(
    theme: Theme,
    stageWidth: number,
    stageHeight: number,
    babyNaturalWidth: number,
    babyNaturalHeight: number
): BabyTransform {
    const bp = theme.babyPlacement;

    // Convert fractional placement to stage pixel bounding box
    // babyPlacement values are 0-1 fractions (e.g., x: 0.25 means 25% from left)
    // Handle both 0-1 (generated themes) and 0-100 (legacy themes) ranges
    const isLegacy = bp.x > 1 || bp.y > 1 || bp.width > 1 || bp.height > 1;
    const fx = isLegacy ? bp.x / 100 : bp.x;
    const fy = isLegacy ? bp.y / 100 : bp.y;
    const fw = isLegacy ? bp.width / 100 : bp.width;
    const fh = isLegacy ? bp.height / 100 : bp.height;

    const boxCenterX = fx * stageWidth + (fw * stageWidth) / 2;
    const boxCenterY = fy * stageHeight + (fh * stageHeight) / 2;
    const boxW = fw * stageWidth;
    const boxH = fh * stageHeight;

    // Scale baby to FIT inside bounding box (Math.min = fully visible)
    const scaleToFit = Math.min(boxW / babyNaturalWidth, boxH / babyNaturalHeight);

    const fitWidth = babyNaturalWidth * scaleToFit;
    const fitHeight = babyNaturalHeight * scaleToFit;

    // Position based on anchor
    let x: number;
    let y: number;

    switch (bp.anchor) {
        case "top":
            x = boxCenterX - fitWidth / 2;
            y = boxCenterY - boxH / 2;
            break;
        case "bottom":
            x = boxCenterX - fitWidth / 2;
            y = boxCenterY + boxH / 2 - fitHeight;
            break;
        case "center":
        default:
            x = boxCenterX - fitWidth / 2;
            y = boxCenterY - fitHeight / 2;
            break;
    }

    return {
        x,
        y,
        scaleX: scaleToFit,
        scaleY: scaleToFit,
        rotation: bp.rotation,
    };
}

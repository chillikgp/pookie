/**
 * Shared shadow utility — creates a pure black silhouette canvas
 * from any image source. Used by the export renderer.
 *
 * Pipeline:
 *   1. Draw source onto temp canvas (preserves alpha/mask)
 *   2. Fill black using `source-in` compositing (only visible pixels become black)
 *   3. Return the black silhouette canvas
 */
export function createShadowCanvas(
    source: HTMLCanvasElement | HTMLImageElement
): HTMLCanvasElement {
    const w = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
    const h = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Draw the source (preserves alpha from mask)
    ctx.drawImage(source, 0, 0);

    // Force all visible pixels to solid black
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "source-over";

    return canvas;
}

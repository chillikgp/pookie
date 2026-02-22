import { Theme } from "./themes";
import { BabyTransform, AdjustValues, MaskStroke } from "./store";
import { calculateShadowOffset } from "./shadow";
import { applyFiltersToImageData } from "./filters";
import { createShadowCanvas } from "./shadowCanvas";

export interface RenderConfig {
    theme: Theme;
    babyImageUrl: string;
    babyTransform: BabyTransform;
    adjustValues: AdjustValues;
    maskStrokes: MaskStroke[];
    mode: "preview" | "export";
    stageWidth?: number;
    stageHeight?: number;
}

/**
 * Render full composition to an offscreen canvas.
 * Uses the SAME filter math as CanvasStage (via applyFiltersToImageData)
 * to ensure preview ↔ export parity.
 *
 * Pipeline order (matches preview exactly):
 *   1. Background layers
 *   2. Shadow (black silhouette of filtered+masked baby)
 *   3. Filtered+masked baby
 *   4. Foreground layers
 *   5. Watermark (export only)
 */
export async function renderToCanvas(config: RenderConfig): Promise<string> {
    const { theme, babyImageUrl, babyTransform, adjustValues, maskStrokes, mode } = config;

    // 1️⃣ Cap Maximum Dimension at 2048px (Aspect Ratio Safe)
    const MAX_EXPORT_DIMENSION = 2048;
    const maxPreview = 1200;

    let scaleFactor: number;
    if (mode === "export") {
        scaleFactor = Math.min(1, MAX_EXPORT_DIMENSION / Math.max(theme.width, theme.height));
    } else {
        const maxDim = Math.max(theme.width, theme.height);
        scaleFactor = maxDim <= maxPreview ? 1 : maxPreview / maxDim;
    }

    const outWidth = Math.round(theme.width * scaleFactor);
    const outHeight = Math.round(theme.height * scaleFactor);

    // Scale from stage coords → output coords
    // babyTransform and maskStrokes are in stage coords (e.g. 420px wide)
    const stageWidth = config.stageWidth || outWidth;
    const upscale = outWidth / stageWidth;

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d")!;

    // 🧠 Color Space Safety & Quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Sort layers
    const sortedLayers = [...theme.layers].sort((a, b) => a.zIndex - b.zIndex);
    const belowBaby = sortedLayers.filter((l) => l.zIndex < theme.babyZIndex);
    const aboveBaby = sortedLayers.filter((l) => l.zIndex > theme.babyZIndex);

    // ─── Step 1: Draw background layers ─────────────────────────────
    for (const layer of belowBaby) {
        const img = await loadImage(layer.url);
        ctx.drawImage(img, 0, 0, outWidth, outHeight);
    }

    // ─── Step 2: Build masked + filtered baby ───────────────────────
    const babyImg = await loadImage(babyImageUrl);

    let maskedBaby: HTMLCanvasElement | HTMLImageElement = babyImg;
    if (maskStrokes.length > 0) {
        // Pass original baby dimensions to applyMaskToImage to maintain quality
        // but it will be drawn with upscale later
        maskedBaby = applyMaskToImage(babyImg, maskStrokes, babyTransform, upscale);
    }

    const filteredBaby = applyFiltersToCanvas(maskedBaby, adjustValues);

    // ─── Step 3: Draw shadow (black silhouette of filtered+masked baby) ─
    if (theme.shadow.enabled) {
        const shadowOffset = calculateShadowOffset(theme.shadow);

        // Do not multiply blur by upscale! ctx.filter is affected by ctx.scale().
        // If we multiply here, the blur gets squared relative to the upscale factor.
        const scaledBlur = theme.shadow.blur;
        const scaledOffsetX = shadowOffset.offsetX * upscale;
        const scaledOffsetY = shadowOffset.offsetY * upscale;

        const shadowSilhouette = createShadowCanvas(filteredBaby);

        ctx.save();
        ctx.globalAlpha = theme.shadow.opacity;
        ctx.filter = `blur(${scaledBlur}px)`;

        ctx.translate(
            babyTransform.x * upscale + scaledOffsetX,
            babyTransform.y * upscale + scaledOffsetY
        );
        ctx.rotate((babyTransform.rotation * Math.PI) / 180);
        ctx.scale(
            babyTransform.scaleX * upscale,
            babyTransform.scaleY * upscale
        );

        ctx.drawImage(shadowSilhouette, 0, 0);

        ctx.restore();

        // 6️⃣ Reset Canvas Filters Properly
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }

    // ─── Step 4: Draw filtered baby ─────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(babyTransform.x * upscale, babyTransform.y * upscale);
    ctx.rotate((babyTransform.rotation * Math.PI) / 180);
    ctx.scale(babyTransform.scaleX * upscale, babyTransform.scaleY * upscale);
    ctx.drawImage(filteredBaby, 0, 0);
    ctx.restore();

    // ─── Step 5: Foreground layers ──────────────────────────────────
    for (const layer of aboveBaby) {
        const img = await loadImage(layer.url);
        ctx.drawImage(img, 0, 0, outWidth, outHeight);
    }

    // ─── Step 6: Watermark (export only) ────────────────────────────
    if (mode === "export") {
        drawWatermark(ctx, outWidth, outHeight);
    }

    // 1️⃣ Change Export Format to JPEG
    return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Apply brightness/contrast/saturation/warmth to an image.
 * Uses the same pixel-level math as Konva filters for export parity.
 */
function applyFiltersToCanvas(
    source: HTMLCanvasElement | HTMLImageElement,
    values: AdjustValues
): HTMLCanvasElement {
    const w = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
    const h = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);

    // Skip if all values are zero
    const hasFilters = values.brightness !== 0 || values.contrast !== 0 ||
        values.vibrance !== 0 || values.warmth !== 0;
    if (!hasFilters) return canvas;

    const imageData = ctx.getImageData(0, 0, w, h);
    applyFiltersToImageData(imageData, values);
    ctx.putImageData(imageData, 0, 0);

    return canvas;
}

/**
 * Apply mask strokes to baby image.
 */
function applyMaskToImage(
    babyImg: HTMLImageElement,
    strokes: MaskStroke[],
    transform: BabyTransform,
    _upscale: number
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = babyImg.naturalWidth;
    canvas.height = babyImg.naturalHeight;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(babyImg, 0, 0);

    const cos = Math.cos((-transform.rotation * Math.PI) / 180);
    const sin = Math.sin((-transform.rotation * Math.PI) / 180);

    for (const stroke of strokes) {
        // nativeBrushSize = stagePixels / scaleInStage
        const nativeBrushSize = stroke.brushSize / transform.scaleX;
        ctx.lineWidth = nativeBrushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (stroke.type === "erase") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.beginPath();
            for (let i = 0; i < stroke.points.length; i += 2) {
                const dx = stroke.points[i] - transform.x;
                const dy = stroke.points[i + 1] - transform.y;
                const rx = dx * cos - dy * sin;
                const ry = dx * sin + dy * cos;
                const px = rx / transform.scaleX;
                const py = ry / transform.scaleY;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        } else {
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.beginPath();
            for (let i = 0; i < stroke.points.length; i += 2) {
                const dx = stroke.points[i] - transform.x;
                const dy = stroke.points[i + 1] - transform.y;
                const rx = dx * cos - dy * sin;
                const ry = dx * sin + dy * cos;
                const px = rx / transform.scaleX;
                const py = ry / transform.scaleY;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.clip();
            ctx.drawImage(babyImg, 0, 0);
            ctx.restore();
        }
    }

    return canvas;
}

function drawWatermark(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    _canvasHeight: number
): void {
    const padding = canvasWidth * 0.04;
    const fontSize = Math.round(canvasWidth * 0.035);

    ctx.save();
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    const text = "MelaBabu";
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const pillX = canvasWidth - padding - textWidth - 16;
    const pillY = padding;
    const pillW = textWidth + 32;
    const pillH = fontSize + 16;

    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 8);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText(text, canvasWidth - padding - 8, padding + 8);
    ctx.restore();

    void _canvasHeight;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}


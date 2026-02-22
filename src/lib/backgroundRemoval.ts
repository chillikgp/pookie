/**
 * Real background removal using U2NetP ONNX model.
 *
 * Pipeline:
 * 1. Load image → downscale to max 1024px (this becomes the working image)
 * 2. Resize to 320×320 for model input
 * 3. Normalize: pixel / 255 only (no ImageNet mean/std — U2NetP expects this)
 * 4. Run inference with onnxruntime-web (WebGL → WASM fallback)
 * 5. Extract mask, conditionally apply sigmoid based on output range
 * 6. Resize mask back to working image dimensions
 * 7. Apply mask as alpha channel
 * 8. Return transparent PNG data URL
 */

import * as ort from "onnxruntime-web";

const MODEL_URL = "/models/u2netp.onnx";
const MODEL_INPUT_SIZE = 320;
const MAX_INFERENCE_SIZE = 1024;

export interface BackgroundRemovalResult {
    success: boolean;
    imageUrl: string | null;
    error?: string;
}

// ─── Singleton session ───────────────────────────────────────────
let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
    if (!sessionPromise) {
        // Configure WASM paths to serve from /public/
        ort.env.wasm.wasmPaths = "/";
        ort.env.wasm.numThreads = 1;

        sessionPromise = ort.InferenceSession.create(MODEL_URL, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
        }).catch((err) => {
            // Reset so next call retries
            sessionPromise = null;
            throw err;
        });
    }
    return sessionPromise;
}

// ─── Public API ──────────────────────────────────────────────────
export async function removeBackground(
    imageDataUrl: string
): Promise<BackgroundRemovalResult> {
    try {
        const resultUrl = await runInference(imageDataUrl);
        return { success: true, imageUrl: resultUrl };
    } catch (error) {
        console.error("[BG Removal] Error:", error);
        return {
            success: false,
            imageUrl: null,
            error:
                error instanceof Error
                    ? error.message
                    : "Background removal failed",
        };
    }
}

// ─── Core inference pipeline ─────────────────────────────────────
async function runInference(imageDataUrl: string): Promise<string> {
    // 1. Load original image
    const img = await loadImage(imageDataUrl);

    // 2. Downscale to max inference size — THIS becomes the working image
    //    (mask is applied to this, not the original)
    const { canvas: workingCanvas, ctx: workingCtx } = downscaleToMax(
        img,
        MAX_INFERENCE_SIZE
    );
    const workingW = workingCanvas.width;
    const workingH = workingCanvas.height;

    // 3. Resize to model input (320×320)
    const inputCanvas = document.createElement("canvas");
    inputCanvas.width = MODEL_INPUT_SIZE;
    inputCanvas.height = MODEL_INPUT_SIZE;
    const inputCtx = inputCanvas.getContext("2d")!;
    inputCtx.drawImage(workingCanvas, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

    // 4. Extract pixel data and build tensor
    const inputData = inputCtx.getImageData(
        0,
        0,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE
    );
    const tensorData = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
    const pixels = inputData.data;

    // NCHW format, normalize to [0,1] only (no mean/std)
    for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
        tensorData[i] = pixels[i * 4] / 255; // R
        tensorData[MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + i] =
            pixels[i * 4 + 1] / 255; // G
        tensorData[2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + i] =
            pixels[i * 4 + 2] / 255; // B
    }

    const inputTensor = new ort.Tensor("float32", tensorData, [
        1,
        3,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
    ]);

    // 5. Run model
    const session = await getSession();
    const inputName = session.inputNames[0];
    const results = await session.run({ [inputName]: inputTensor });

    // 6. Get output — use first output (d0 = finest resolution mask)
    const outputName = session.outputNames[0];
    const outputTensor = results[outputName];
    const outputData = outputTensor.data as Float32Array;

    // 7. Check if sigmoid is needed (if values outside [0,1])
    let maskRaw = outputData;
    let needsSigmoid = false;
    for (let i = 0; i < Math.min(100, outputData.length); i++) {
        if (outputData[i] < -0.01 || outputData[i] > 1.01) {
            needsSigmoid = true;
            break;
        }
    }

    if (needsSigmoid) {
        maskRaw = new Float32Array(outputData.length);
        for (let i = 0; i < outputData.length; i++) {
            maskRaw[i] = 1 / (1 + Math.exp(-outputData[i]));
        }
    }

    // 8. Get mask dimensions from output tensor shape
    const outShape = outputTensor.dims;
    const maskH =
        outShape.length === 4
            ? Number(outShape[2])
            : Number(outShape[outShape.length - 2]);
    const maskW =
        outShape.length === 4
            ? Number(outShape[3])
            : Number(outShape[outShape.length - 1]);

    // 9. Resize mask to working image size
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskW;
    maskCanvas.height = maskH;
    const maskCtx = maskCanvas.getContext("2d")!;
    const maskImageData = maskCtx.createImageData(maskW, maskH);

    // Normalize mask to [0, 255]
    let minVal = Infinity,
        maxVal = -Infinity;
    for (let i = 0; i < maskRaw.length; i++) {
        if (maskRaw[i] < minVal) minVal = maskRaw[i];
        if (maskRaw[i] > maxVal) maxVal = maskRaw[i];
    }
    const range = maxVal - minVal || 1;

    for (let i = 0; i < maskW * maskH; i++) {
        const v = Math.round(((maskRaw[i] - minVal) / range) * 255);
        maskImageData.data[i * 4] = v;
        maskImageData.data[i * 4 + 1] = v;
        maskImageData.data[i * 4 + 2] = v;
        maskImageData.data[i * 4 + 3] = 255;
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // Upscale mask to working image dimensions
    const scaledMaskCanvas = document.createElement("canvas");
    scaledMaskCanvas.width = workingW;
    scaledMaskCanvas.height = workingH;
    const scaledMaskCtx = scaledMaskCanvas.getContext("2d")!;
    scaledMaskCtx.drawImage(maskCanvas, 0, 0, workingW, workingH);

    // 10. Apply mask as alpha channel to working image
    const workingImageData = workingCtx.getImageData(0, 0, workingW, workingH);
    const scaledMaskData = scaledMaskCtx.getImageData(0, 0, workingW, workingH);

    for (let i = 0; i < workingW * workingH; i++) {
        workingImageData.data[i * 4 + 3] = scaledMaskData.data[i * 4]; // R channel of mask → alpha
    }

    // Write masked result
    const maskedCanvas = document.createElement("canvas");
    maskedCanvas.width = workingW;
    maskedCanvas.height = workingH;
    const maskedCtx = maskedCanvas.getContext("2d")!;
    maskedCtx.putImageData(workingImageData, 0, 0);

    // 11. Crop transparent space — tight bounding box around content
    const croppedCanvas = cropTransparentSpace(maskedCanvas, 5);
    return croppedCanvas.toDataURL("image/png");
}

// ─── Helpers ─────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
}

function downscaleToMax(
    img: HTMLImageElement,
    maxDim: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (Math.max(w, h) > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx };
}

/**
 * Crop transparent space from a canvas.
 * Finds the tight alpha bounding box and returns a new canvas
 * with only the content region + padding.
 */
function cropTransparentSpace(
    sourceCanvas: HTMLCanvasElement,
    padding: number = 5
): HTMLCanvasElement {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const threshold = 5; // alpha threshold

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const alpha = data[(y * w + x) * 4 + 3];
            if (alpha > threshold) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // If no opaque pixels found, return original
    if (!found) return sourceCanvas;

    // Add padding, clamped to canvas bounds
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w - 1, maxX + padding);
    maxY = Math.min(h - 1, maxY + padding);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext("2d")!;
    croppedCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    return croppedCanvas;
}

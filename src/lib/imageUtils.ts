/**
 * Load an image file and downscale if larger than maxDim.
 * Prevents mobile performance issues with 12MP+ images.
 *
 * @param file - The image file to load
 * @param maxDim - Maximum dimension (width or height), default 2000px
 * @returns Data URL of the (possibly downscaled) image
 */
export async function loadAndScaleImage(
    file: File,
    maxDim: number = 2000
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;

            // Verify we got a valid data URL
            if (!dataUrl || !dataUrl.startsWith("data:")) {
                reject(new Error("FileReader produced invalid data URL"));
                return;
            }

            const img = new Image();
            img.onload = () => {
                if (img.width <= maxDim && img.height <= maxDim) {
                    // No scaling needed — return as PNG to ensure compatibility
                    try {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                            reject(new Error("Could not create canvas context"));
                            return;
                        }
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL("image/png"));
                    } catch (err) {
                        // Fallback: return original data URL
                        resolve(dataUrl);
                    }
                    return;
                }

                // Calculate scaled dimensions
                const ratio = Math.min(maxDim / img.width, maxDim / img.height);
                const newWidth = Math.round(img.width * ratio);
                const newHeight = Math.round(img.height * ratio);

                // Draw scaled image
                const canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not create canvas context"));
                    return;
                }
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () =>
                reject(
                    new Error(
                        `Browser cannot decode this image format (${file.type || "unknown"}). ` +
                        `Try converting to JPG or PNG first.`
                    )
                );
            img.src = dataUrl;
        };
        reader.onerror = () =>
            reject(new Error(`Failed to read file: ${reader.error?.message || "unknown error"}`));
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file type
 */
export function isValidImageType(file: File): boolean {
    const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        // Note: HEIC/HEIF are valid file types but most browsers can't decode them.
        // We allow them through validation but loadAndScaleImage will give a clear error.
        "image/heic",
        "image/heif",
    ];
    // Also allow if no type (some browsers don't report type for certain formats)
    return !file.type || validTypes.includes(file.type);
}

/**
 * Get stored photos from localStorage
 */
export function getStoredPhotos(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const photos = localStorage.getItem("melababu_photos");
        return photos ? JSON.parse(photos) : [];
    } catch {
        return [];
    }
}

/**
 * Save a photo to localStorage (best effort — silently fails on quota exceeded)
 */
export function savePhoto(dataUrl: string): void {
    try {
        const photos = getStoredPhotos();
        photos.unshift(dataUrl);
        if (photos.length > 10) photos.pop(); // Keep fewer to avoid quota issues
        localStorage.setItem("melababu_photos", JSON.stringify(photos));
    } catch {
        // localStorage full — clear old photos and try with just this one
        try {
            localStorage.setItem("melababu_photos", JSON.stringify([dataUrl]));
        } catch {
            // Still failing — skip storage entirely
            console.warn("[imageUtils] localStorage quota exceeded, skipping photo save");
        }
    }
}

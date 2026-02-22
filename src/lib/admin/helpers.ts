/**
 * Admin helper utilities.
 */

/** Generate a URL-safe theme ID from a name */
export function generateThemeId(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
}

/** Detect image dimensions from a File */
export function detectImageDimensions(
    file: File
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to detect image dimensions"));
        };
        img.src = url;
    });
}

/** Convert a File to a data URL */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

/** Status color for badges */
export function statusColor(status: string): string {
    switch (status) {
        case "published": return "#22c55e";
        case "draft": return "#f59e0b";
        case "archived": return "#94a3b8";
        default: return "#6b7280";
    }
}

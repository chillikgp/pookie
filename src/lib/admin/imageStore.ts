/**
 * IndexedDB-backed storage for theme layer images.
 *
 * localStorage has a ~5MB limit which is easily exceeded by a single
 * high-res PNG encoded as a data URL. This module stores image blobs
 * in IndexedDB (which has GB-level storage) and only keeps lightweight
 * metadata in localStorage.
 *
 * Each image is stored as: { id: "<themeId>__<layerIndex>", dataUrl: string }
 */

const DB_NAME = "melababu_admin";
const DB_VERSION = 2;
const STORE_NAME = "layer_images";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
                console.log("[imageStore] Created object store:", STORE_NAME);
            }
        };
        req.onsuccess = () => {
            console.log("[imageStore] DB opened, stores:", Array.from(req.result.objectStoreNames));
            resolve(req.result);
        };
        req.onerror = () => {
            console.error("[imageStore] DB open failed:", req.error);
            reject(req.error);
        };
    });
}

/**
 * Save a layer image to IndexedDB.
 * @param themeId - Theme identifier
 * @param layerIndex - Layer index within the theme
 * @param dataUrl - Base64 data URL of the image
 */
export async function saveLayerImage(
    themeId: string,
    layerIndex: number,
    dataUrl: string
): Promise<string> {
    const id = `${themeId}__layer_${layerIndex}`;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ id, dataUrl });
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Load a layer image from IndexedDB.
 * @returns The data URL string, or null if not found.
 */
export async function loadLayerImage(
    themeId: string,
    layerIndex: number
): Promise<string | null> {
    const id = `${themeId}__layer_${layerIndex}`;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result?.dataUrl ?? null);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Save all layer images for a theme and return placeholder URLs.
 * The placeholder format is: `idb://<themeId>__layer_<index>`
 * These are resolved at load time by `resolveLayerUrls()`.
 */
export async function saveThemeLayerImages(
    themeId: string,
    layers: { previewUrl: string; exportUrl: string; zIndex: number; visible?: boolean }[]
): Promise<{ previewUrl: string; exportUrl: string; zIndex: number; visible?: boolean }[]> {
    const resolved = [];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        // Only store data URLs in IndexedDB (external URLs are fine as-is)
        if (layer.previewUrl.startsWith("data:")) {
            console.log(`[imageStore] Saving layer ${i} (${layer.previewUrl.length} chars) to IndexedDB`);
            await saveLayerImage(themeId, i, layer.previewUrl);
            resolved.push({ ...layer, previewUrl: `idb://${themeId}__layer_${i}`, exportUrl: `idb://${themeId}__layer_${i}` });
        } else {
            resolved.push(layer);
        }
    }
    console.log("[imageStore] Saved layers, placeholders:", resolved.map(l => l.previewUrl));
    return resolved;
}

/**
 * Resolve `idb://` placeholder URLs back to real data URLs from IndexedDB.
 */
export async function resolveLayerUrls(
    layers: { previewUrl: string; exportUrl: string; zIndex: number; visible?: boolean }[]
): Promise<{ previewUrl: string; exportUrl: string; zIndex: number; visible?: boolean }[]> {
    const resolved = [];
    for (const layer of layers) {
        if (layer.previewUrl.startsWith("idb://")) {
            // Parse: idb://<themeId>__layer_<index>
            const key = layer.previewUrl.replace("idb://", "");
            const match = key.match(/^(.+)__layer_(\d+)$/);
            if (match) {
                const dataUrl = await loadLayerImage(match[1], parseInt(match[2]));
                resolved.push({ ...layer, previewUrl: dataUrl || layer.previewUrl, exportUrl: dataUrl || layer.exportUrl });
            } else {
                resolved.push(layer);
            }
        } else {
            resolved.push(layer);
        }
    }
    return resolved;
}

/**
 * Delete all layer images for a theme from IndexedDB.
 */
export async function deleteThemeLayerImages(themeId: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Get all keys and delete those matching this theme
    const allKeys: IDBValidKey[] = await new Promise((resolve, reject) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    for (const key of allKeys) {
        if (typeof key === "string" && key.startsWith(`${themeId}__`)) {
            store.delete(key);
        }
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * POST /api/admin/bake-overrides
 *
 * Receives admin overrides from the browser's localStorage and
 * merges them into themes.generated.ts so they survive deploys.
 *
 * For new themes (created via /admin/new), this also writes
 * layer images to /public/themes/<id>/ and triggers regeneration.
 *
 * This is a development-only endpoint — it writes to the source tree.
 */

interface LayerData {
    url: string;
    zIndex: number;
    visible?: boolean;
    /** Base64 data URL — only present for images from IndexedDB */
    dataUrl?: string;
}

interface ThemeOverride {
    id: string;
    name?: string;
    collection?: string;
    version?: number;
    status?: string;
    babyPlacement?: {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        anchor: string;
    };
    babyZIndex?: number;
    shadow?: {
        enabled: boolean;
        angle: number;
        distance: number;
        blur: number;
        opacity: number;
    };
    defaultAdjust?: {
        brightness: number;
        contrast: number;
        vibrance: number;
        warmth: number;
    };
    layers?: LayerData[];
    width?: number;
    height?: number;
    [key: string]: unknown;
}

const THEMES_DIR = path.resolve(process.cwd(), "public/themes");

/**
 * Write a base64 data URL to a file on disk.
 */
function writeDataUrlToFile(dataUrl: string, filePath: string): void {
    // data:image/png;base64,iVBOR...
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
        console.warn(`[bake] Invalid data URL format, skipping`);
        return;
    }
    const buffer = Buffer.from(match[2], "base64");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    console.log(`[bake] Wrote ${buffer.length} bytes → ${filePath}`);
}

export async function POST(req: NextRequest) {
    try {
        const { overrides } = (await req.json()) as { overrides: ThemeOverride[] };

        if (!Array.isArray(overrides) || overrides.length === 0) {
            return NextResponse.json({ error: "No overrides provided" }, { status: 400 });
        }

        const generatedPath = path.resolve(
            process.cwd(),
            "src/lib/themes.generated.ts"
        );

        if (!fs.existsSync(generatedPath)) {
            return NextResponse.json(
                { error: "themes.generated.ts not found" },
                { status: 500 }
            );
        }

        let content = fs.readFileSync(generatedPath, "utf-8");
        let patchedCount = 0;
        let imagesWritten = 0;
        let needsRegenerate = false;

        for (const override of overrides) {
            if (!override.id) continue;

            // ── Write layer images to disk ──
            if (override.layers) {
                const themeDir = path.join(THEMES_DIR, override.id);

                for (const layer of override.layers) {
                    // If the layer has inline image data (resolved from IndexedDB)
                    if (layer.dataUrl && layer.dataUrl.startsWith("data:")) {
                        const ext = layer.dataUrl.match(/^data:image\/(\w+)/)?.[1] || "png";
                        const fileName = layer.zIndex === 0
                            ? `background.${ext}`
                            : `foreground.${ext}`;
                        const filePath = path.join(themeDir, fileName);
                        writeDataUrlToFile(layer.dataUrl, filePath);
                        imagesWritten++;
                        needsRegenerate = true;
                    }
                }
            }

            // ── Patch existing theme in generated file ──
            const themeIdPattern = `id: "${override.id}"`;
            if (!content.includes(themeIdPattern)) {
                console.log(`[bake] Theme "${override.id}" not in generated file yet (will be added by regeneration)`);
                needsRegenerate = true;
                continue;
            }

            // Patch babyPlacement
            if (override.babyPlacement) {
                const bp = override.babyPlacement;
                const placementBlock = `babyPlacement: {
      x: ${bp.x},
      y: ${bp.y},
      width: ${bp.width},
      height: ${bp.height},
      rotation: ${bp.rotation},
      anchor: "${bp.anchor}" as const,
    }`;
                content = replaceThemeBlock(content, override.id, "babyPlacement", placementBlock);
            }

            // Patch shadow
            if (override.shadow) {
                const s = override.shadow;
                const shadowBlock = `shadow: {
      enabled: ${s.enabled},
      angle: ${s.angle},
      distance: ${s.distance},
      blur: ${s.blur},
      opacity: ${s.opacity},
    }`;
                content = replaceThemeBlock(content, override.id, "shadow", shadowBlock);
            }

            // Patch defaultAdjust
            if (override.defaultAdjust) {
                const a = override.defaultAdjust;
                const adjustStr = `defaultAdjust: { brightness: ${a.brightness}, contrast: ${a.contrast}, vibrance: ${a.vibrance}, warmth: ${a.warmth} }`;
                content = replaceThemeBlock(content, override.id, "defaultAdjust", adjustStr);
            }

            // Patch babyZIndex
            if (override.babyZIndex !== undefined) {
                content = replaceThemeField(content, override.id, "babyZIndex", String(override.babyZIndex));
            }

            // Patch status
            if (override.status) {
                content = replaceThemeField(content, override.id, "status", `"${override.status}" as const`);
            }

            // Patch version
            if (override.version !== undefined) {
                content = replaceThemeField(content, override.id, "version", String(override.version));
            }

            // Patch name
            if (override.name) {
                content = replaceThemeField(content, override.id, "name", `"${override.name}"`);
            }

            // Patch collection
            if (override.collection) {
                content = replaceThemeField(content, override.id, "collection", `"${override.collection}"`);
            }

            patchedCount++;
        }

        // Update the generated timestamp
        content = content.replace(
            /\/\/ Generated: .*/,
            `// Generated: ${new Date().toISOString()}`
        );

        fs.writeFileSync(generatedPath, content, "utf-8");

        // ── Regenerate if new images were written ──
        if (needsRegenerate) {
            console.log("[bake] Running generate:themes to pick up new images...");
            try {
                execSync("npm run generate:themes", {
                    cwd: process.cwd(),
                    stdio: "pipe",
                    timeout: 30000,
                });
                console.log("[bake] Regeneration complete");
            } catch (e) {
                console.error("[bake] Regeneration failed:", e);
            }
        }

        return NextResponse.json({
            success: true,
            patched: patchedCount,
            imagesWritten,
            regenerated: needsRegenerate,
            total: overrides.length,
            message: `Baked ${patchedCount} override(s)${imagesWritten > 0 ? `, wrote ${imagesWritten} image(s) to disk` : ""}${needsRegenerate ? ", regenerated themes" : ""}`,
        });
    } catch (err) {
        console.error("[bake-overrides] Error:", err);
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}

/**
 * Replace a multi-line block (like babyPlacement: { ... }) within a specific theme.
 */
function replaceThemeBlock(
    content: string,
    themeId: string,
    blockName: string,
    replacement: string
): string {
    const themeStart = content.indexOf(`id: "${themeId}"`);
    if (themeStart === -1) return content;

    const nextThemeStart = content.indexOf('\n  {', themeStart + 1);
    const themeEnd = nextThemeStart === -1 ? content.length : nextThemeStart;

    const themeSection = content.substring(themeStart, themeEnd);

    const blockStartIdx = themeSection.indexOf(`${blockName}:`);
    if (blockStartIdx === -1) return content;

    const afterBlockName = themeSection.substring(blockStartIdx);
    const braceStart = afterBlockName.indexOf('{');
    if (braceStart === -1) return content;

    let depth = 0;
    let braceEnd = -1;
    for (let i = braceStart; i < afterBlockName.length; i++) {
        if (afterBlockName[i] === '{') depth++;
        if (afterBlockName[i] === '}') {
            depth--;
            if (depth === 0) {
                braceEnd = i;
                break;
            }
        }
    }

    if (braceEnd === -1) return content;

    const fullMatch = afterBlockName.substring(0, braceEnd + 1);
    const newThemeSection = themeSection.replace(fullMatch, replacement);

    return content.substring(0, themeStart) + newThemeSection + content.substring(themeEnd);
}

/**
 * Replace a simple field value within a specific theme.
 */
function replaceThemeField(
    content: string,
    themeId: string,
    fieldName: string,
    newValue: string
): string {
    const themeStart = content.indexOf(`id: "${themeId}"`);
    if (themeStart === -1) return content;

    const nextThemeStart = content.indexOf('\n  {', themeStart + 1);
    const themeEnd = nextThemeStart === -1 ? content.length : nextThemeStart;

    const themeSection = content.substring(themeStart, themeEnd);

    const regex = new RegExp(`(${fieldName}:\\s*)([^,\\n]+)`);
    const newThemeSection = themeSection.replace(regex, `$1${newValue}`);

    return content.substring(0, themeStart) + newThemeSection + content.substring(themeEnd);
}

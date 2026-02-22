#!/usr/bin/env tsx

/**
 * Theme metadata generator.
 * 
 * Scans /public/themes/ and auto-generates /src/lib/themes.generated.ts
 * 
 * Usage: npm run generate:themes
 */

import fs from "fs";
import path from "path";
import imageSize from "image-size";

// ── Config ──────────────────────────────────────────────────────────

const THEMES_DIR = path.resolve(__dirname, "../public/themes");
const OUTPUT_FILE = path.resolve(__dirname, "../src/lib/themes.generated.ts");

// Collection keyword mapping
const COLLECTION_MAP: Record<string, string> = {
    moon: "Moon & Cloud",
    jungle: "Jungle",
    floral: "Floral",
    hanuman: "Indian Traditional",
    chef: "Professions",
    carnival: "Festival",
    airlines: "Travel",
    bathtub: "Bath",
    boating: "Outdoor",
    holi: "Festival",
    tent: "Outdoor",
    royal: "Royal",
};

// Lighting profile keyword mapping
const LIGHTING_MAP: Record<string, "warm" | "neutral" | "cool"> = {
    moon: "warm",
    floral: "warm",
    hanuman: "warm",
    carnival: "warm",
    holi: "warm",
    jungle: "neutral",
    chef: "neutral",
    airlines: "cool",
    bathtub: "neutral",
    boating: "neutral",
    tent: "neutral",
    royal: "neutral",
};

// Supported background image extensions (in priority order)
const BG_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// ── Helpers ──────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
    return str
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchKeyword(folderName: string, map: Record<string, string>): string | null {
    const lower = folderName.toLowerCase();
    for (const keyword of Object.keys(map)) {
        if (lower.includes(keyword)) {
            return map[keyword];
        }
    }
    return null;
}

function getCollection(folderName: string): string {
    return matchKeyword(folderName, COLLECTION_MAP) || "General";
}

function getLighting(folderName: string): "warm" | "neutral" | "cool" {
    const lower = folderName.toLowerCase();
    for (const keyword of Object.keys(LIGHTING_MAP)) {
        if (lower.includes(keyword)) {
            return LIGHTING_MAP[keyword];
        }
    }
    return "neutral";
}

function findBackgroundFile(themeDir: string): string | null {
    for (const ext of BG_EXTENSIONS) {
        const filePath = path.join(themeDir, `background${ext}`);
        if (fs.existsSync(filePath)) return filePath;
    }
    return null;
}

function hasForeground(themeDir: string): boolean {
    return fs.existsSync(path.join(themeDir, "foreground.png"));
}

function getImageDimensions(filePath: string): { width: number; height: number } {
    try {
        const buffer = fs.readFileSync(filePath);
        const result = imageSize(buffer);
        return {
            width: result.width || 2000,
            height: result.height || 2000,
        };
    } catch {
        console.warn(`  ⚠ Could not read dimensions for: ${filePath}, using default 2000x2000`);
        return { width: 2000, height: 2000 };
    }
}

function getBackgroundUrlExtension(filePath: string): string {
    return path.extname(filePath); // .png, .jpg, .jpeg, etc.
}

// Deterministic "random" shadow based on folder name hash
function shouldHaveShadow(folderName: string): boolean {
    let hash = 0;
    for (let i = 0; i < folderName.length; i++) {
        hash = (hash * 31 + folderName.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 2 === 0;
}

// ── Existing theme parser ────────────────────────────────────────

interface ExistingTheme {
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
}

/**
 * Parse existing themes.generated.ts to preserve baked values.
 * Uses a simple regex approach — not a full TS parser, but works
 * for the predictable format we generate.
 */
function loadExistingThemes(): Map<string, ExistingTheme> {
    const map = new Map<string, ExistingTheme>();

    if (!fs.existsSync(OUTPUT_FILE)) return map;

    try {
        const content = fs.readFileSync(OUTPUT_FILE, "utf-8");

        // Extract each theme block between { id: "..." ... }
        const themeBlocks = content.split(/\n\s*\{/).slice(1); // skip everything before first {

        for (const block of themeBlocks) {
            const idMatch = block.match(/id:\s*"([^"]+)"/);
            if (!idMatch) continue;

            const theme: ExistingTheme = { id: idMatch[1] };

            // Name
            const nameMatch = block.match(/name:\s*"([^"]+)"/);
            if (nameMatch) theme.name = nameMatch[1];

            // Collection
            const collMatch = block.match(/collection:\s*"([^"]+)"/);
            if (collMatch) theme.collection = collMatch[1];

            // Version
            const verMatch = block.match(/version:\s*(\d+)/);
            if (verMatch) theme.version = parseInt(verMatch[1]);

            // Status
            const statusMatch = block.match(/status:\s*"([^"]+)"/);
            if (statusMatch) theme.status = statusMatch[1];

            // Baby Z-Index
            const zMatch = block.match(/babyZIndex:\s*(\d+)/);
            if (zMatch) theme.babyZIndex = parseInt(zMatch[1]);

            // Baby Placement
            const placementSection = block.match(/babyPlacement:\s*\{([^}]+)\}/);
            if (placementSection) {
                const p = placementSection[1];
                const px = p.match(/x:\s*([\d.]+)/);
                const py = p.match(/y:\s*([\d.]+)/);
                const pw = p.match(/width:\s*([\d.]+)/);
                const ph = p.match(/height:\s*([\d.]+)/);
                const pr = p.match(/rotation:\s*([-\d.]+)/);
                const pa = p.match(/anchor:\s*"([^"]+)"/);
                if (px && py && pw && ph) {
                    theme.babyPlacement = {
                        x: parseFloat(px[1]),
                        y: parseFloat(py[1]),
                        width: parseFloat(pw[1]),
                        height: parseFloat(ph[1]),
                        rotation: pr ? parseFloat(pr[1]) : 0,
                        anchor: pa ? pa[1] : "center",
                    };
                }
            }

            // Shadow
            const shadowSection = block.match(/shadow:\s*\{([^}]+)\}/);
            if (shadowSection) {
                const s = shadowSection[1];
                const enabled = s.match(/enabled:\s*(true|false)/);
                const angle = s.match(/angle:\s*([\d.]+)/);
                const dist = s.match(/distance:\s*([\d.]+)/);
                const blur = s.match(/blur:\s*([\d.]+)/);
                const opacity = s.match(/opacity:\s*([\d.]+)/);
                if (enabled) {
                    theme.shadow = {
                        enabled: enabled[1] === "true",
                        angle: angle ? parseFloat(angle[1]) : 0,
                        distance: dist ? parseFloat(dist[1]) : 0,
                        blur: blur ? parseFloat(blur[1]) : 0,
                        opacity: opacity ? parseFloat(opacity[1]) : 0,
                    };
                }
            }

            // Default Adjust
            const adjustSection = block.match(/defaultAdjust:\s*\{([^}]+)\}/);
            if (adjustSection) {
                const a = adjustSection[1];
                const br = a.match(/brightness:\s*([-\d.]+)/);
                const co = a.match(/contrast:\s*([-\d.]+)/);
                const vi = a.match(/vibrance:\s*([-\d.]+)/);
                const wa = a.match(/warmth:\s*([-\d.]+)/);
                theme.defaultAdjust = {
                    brightness: br ? parseFloat(br[1]) : 0,
                    contrast: co ? parseFloat(co[1]) : 0,
                    vibrance: vi ? parseFloat(vi[1]) : 0,
                    warmth: wa ? parseFloat(wa[1]) : 0,
                };
            }

            map.set(theme.id, theme);
        }

        console.log(`   📋 Loaded ${map.size} existing themes to preserve configs\n`);
    } catch (e) {
        console.warn(`   ⚠ Could not parse existing generated file:`, e);
    }

    return map;
}

// Default values
const DEFAULT_PLACEMENT = {
    x: 0.25,
    y: 0.30,
    width: 0.50,
    height: 0.50,
    rotation: 0,
    anchor: "center",
};

const DEFAULT_ADJUST = { brightness: 0, contrast: 0, vibrance: 0, warmth: 0 };

// ── Main ──────────────────────────────────────────────────────────

function main() {
    console.log("🎨 Generating theme metadata...\n");
    console.log(`   Source: ${THEMES_DIR}`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    if (!fs.existsSync(THEMES_DIR)) {
        console.error("❌ Themes directory not found:", THEMES_DIR);
        process.exit(1);
    }

    // Load existing themes to preserve baked configs
    const existing = loadExistingThemes();

    const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
    const themeFolders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

    console.log(`   Found ${themeFolders.length} theme folders\n`);

    const themes: string[] = [];
    let skipped = 0;
    let preserved = 0;

    for (const folder of themeFolders) {
        const themeDir = path.join(THEMES_DIR, folder);
        const bgFile = findBackgroundFile(themeDir);

        if (!bgFile) {
            console.log(`   ⏭ Skipping "${folder}" — no background image found`);
            skipped++;
            continue;
        }

        const bgExt = getBackgroundUrlExtension(bgFile);
        const hasFg = hasForeground(themeDir);
        const dims = getImageDimensions(bgFile);

        // Use existing baked values if available, otherwise defaults
        const prev = existing.get(folder);
        const name = prev?.name || toTitleCase(folder);
        const collection = prev?.collection || getCollection(folder);
        const version = prev?.version || 1;
        const status = prev?.status || "published";
        const babyZIndex = prev?.babyZIndex || 1;
        const placement = prev?.babyPlacement || DEFAULT_PLACEMENT;
        const adjust = prev?.defaultAdjust || DEFAULT_ADJUST;
        const lighting = getLighting(folder);

        // Shadow: preserve existing, or generate default
        let shadowObj: string;
        if (prev?.shadow) {
            const s = prev.shadow;
            shadowObj = `{
      enabled: ${s.enabled},
      angle: ${s.angle},
      distance: ${s.distance},
      blur: ${s.blur},
      opacity: ${s.opacity},
    }`;
            preserved++;
        } else {
            const shadow = shouldHaveShadow(folder);
            shadowObj = shadow
                ? `{
      enabled: true,
      angle: 120,
      distance: 20,
      blur: 40,
      opacity: 0.28,
    }`
                : `{
      enabled: false,
      angle: 0,
      distance: 0,
      blur: 0,
      opacity: 0,
    }`;
        }

        const wasPreserved = !!prev;
        console.log(
            `   ${wasPreserved ? "🔒" : "✅"} ${folder} — ${dims.width}×${dims.height} | ${collection} | fg:${hasFg ? "yes" : "no"}${wasPreserved ? " | PRESERVED" : ""}`
        );

        // Build layers array
        const layers: string[] = [
            `      { url: "/themes/${folder}/background${bgExt}", zIndex: 0 }`,
        ];
        if (hasFg) {
            layers.push(`      { url: "/themes/${folder}/foreground.png", zIndex: 2 }`);
        }

        // Build theme entry
        const entry = `  {
    id: "${folder}",
    name: "${name}",
    collection: "${collection}",
    version: ${version},
    width: ${dims.width},
    height: ${dims.height},
    babyPlacement: {
      x: ${placement.x},
      y: ${placement.y},
      width: ${placement.width},
      height: ${placement.height},
      rotation: ${placement.rotation},
      anchor: "${placement.anchor}" as const,
    },
    babyZIndex: ${babyZIndex},
    shadow: ${shadowObj},
    status: "${status}" as const, defaultAdjust: { brightness: ${adjust.brightness}, contrast: ${adjust.contrast}, vibrance: ${adjust.vibrance}, warmth: ${adjust.warmth} },
    layers: [
${layers.join(",\n")}
    ],
  }`;

        themes.push(entry);
    }

    // ── Write output ──

    const output = `// ⚠️ AUTO-GENERATED — Do not edit manually.
// Run \`npm run generate:themes\` to regenerate.
// Generated: ${new Date().toISOString()}

import { Theme } from "./theme/types";

export const generatedThemes: Theme[] = [
${themes.join(",\n")}
];

export const generatedCollections = [...new Set(generatedThemes.map((t) => t.collection))];

export function getGeneratedThemeById(id: string): Theme | undefined {
  return generatedThemes.find((t) => t.id === id);
}
`;

    fs.writeFileSync(OUTPUT_FILE, output, "utf-8");

    console.log(`\n   ────────────────────────────────────`);
    console.log(`   ✅ Generated ${themes.length} themes`);
    if (preserved > 0) console.log(`   🔒 Preserved configs for ${preserved} themes`);
    if (skipped > 0) console.log(`   ⏭ Skipped ${skipped} folders (no background)`);
    console.log(`   📄 Output: ${OUTPUT_FILE}`);
    console.log(`   ────────────────────────────────────\n`);
}

main();


import fs from "fs";
import path from "path";
import sharp from "sharp";

const THEMES_DIR = path.resolve(__dirname, "../public/themes");
const MAX_PREVIEW_DIMENSION = 1000;
const PREVIEW_QUALITY = 85;

async function processImage(
    srcPath: string,
    isForeground: boolean
) {
    if (!fs.existsSync(srcPath)) return;

    const dir = path.dirname(srcPath);
    const basename = path.basename(srcPath, path.extname(srcPath));

    const exportPath = path.join(dir, `${basename}.export.png`);
    const previewExt = isForeground ? ".png" : ".jpg";
    const previewPath = path.join(dir, `${basename}.preview${previewExt}`);

    console.log(`Processing: ${srcPath}`);

    // Create export matching original (copy if it doesn't exist)
    if (!fs.existsSync(exportPath)) {
        fs.copyFileSync(srcPath, exportPath);
        console.log(`  -> Created export asset: ${exportPath}`);
    }

    // Create downscaled preview
    if (!fs.existsSync(previewPath)) {
        const metadata = await sharp(srcPath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        let resizeOptions = {};
        if (width > MAX_PREVIEW_DIMENSION || height > MAX_PREVIEW_DIMENSION) {
            resizeOptions = {
                width: width >= height ? MAX_PREVIEW_DIMENSION : undefined,
                height: height > width ? MAX_PREVIEW_DIMENSION : undefined,
                fit: 'inside'
            };
        }

        let pipeline = sharp(srcPath).resize(resizeOptions);

        if (isForeground) {
            pipeline = pipeline.png({ quality: PREVIEW_QUALITY });
        } else {
            pipeline = pipeline.jpeg({ quality: PREVIEW_QUALITY });
        }

        await pipeline.toFile(previewPath);
        console.log(`  -> Created preview asset: ${previewPath}`);
    } else {
        console.log(`  -> Preview asset already exists: ${previewPath}`);
    }
}

async function main() {
    console.log("🎨 Generating theme assets (Previews & Exports)...\n");

    if (!fs.existsSync(THEMES_DIR)) {
        console.error("❌ Themes directory not found:", THEMES_DIR);
        process.exit(1);
    }

    const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
    const themeFolders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

    for (const folder of themeFolders) {
        const themeDir = path.join(THEMES_DIR, folder);

        // Process Background
        const bgExts = [".png", ".jpg", ".jpeg", ".webp"];
        for (const ext of bgExts) {
            const bgPath = path.join(themeDir, `background${ext}`);
            if (fs.existsSync(bgPath)) {
                await processImage(bgPath, false);
                break; // Only process the first found background
            }
        }

        // Process Foreground
        const fgPath = path.join(themeDir, "foreground.png");
        if (fs.existsSync(fgPath)) {
            await processImage(fgPath, true);
        }
    }

    console.log("\n✅ Theme assets generation complete!");
}

main().catch(console.error);

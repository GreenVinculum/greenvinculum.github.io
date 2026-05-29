/**
 * Optional: build animated WebP from PNG frames (no browser required).
 * Export frames from /?wireframeBake=1 or place PNGs in scripts/bake-output/frames/
 * Usage: npm run encode:wireframe-loop
 */
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const framesDir = path.join(__dirname, "bake-output", "frames");
const outMedia = path.join(root, "public", "media");
const loopScale = Number(process.env.WIREFRAME_BAKE_SCALE || 0.55);
const delayMs = Number(process.env.WIREFRAME_FRAME_DELAY || 42);

async function main() {
  await mkdir(outMedia, { recursive: true });
  const files = (await readdir(framesDir))
    .filter((f) => /^frame-\d+\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.error(`No frames found in ${framesDir}`);
    console.error("Use /?wireframeBake=1 → “Download frame PNGs”, or add frame-000.png, …");
    process.exit(1);
  }

  const meta = await sharp(path.join(framesDir, files[0])).metadata();
  const targetW = Math.round((meta.width || 760) * loopScale);
  const targetH = Math.round((meta.height || 1080) * loopScale);

  const resized = await Promise.all(
    files.map((f) =>
      sharp(path.join(framesDir, f))
        .resize(targetW, targetH, { fit: "inside" })
        .png()
        .toBuffer()
    )
  );

  const loopPath = path.join(outMedia, "wireframe-loop.webp");
  await sharp(resized, { animated: true })
    .webp({ loop: true, delay: delayMs, effort: 4, quality: 82 })
    .toFile(loopPath);

  const posterPath = path.join(outMedia, "wireframe-poster.webp");
  await sharp(resized[0]).webp({ quality: 88 }).toFile(posterPath);

  console.log(`Wrote ${loopPath} (${files.length} frames)`);
  console.log(`Wrote ${posterPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

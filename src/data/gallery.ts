import fs from "node:fs";
import path from "node:path";

export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  wide?: boolean;
};

type GalleryMetaEntry = {
  caption?: string;
  alt?: string;
  wide?: boolean;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const META_PATH = path.join(GALLERY_DIR, "gallery.json");

const titleFromFilename = (filename: string) =>
  filename
    .replace(/\.[^.]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const loadMeta = (): Record<string, GalleryMetaEntry> => {
  if (!fs.existsSync(META_PATH)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
};

/** Images in public/gallery/ — add files there; optional captions in gallery.json. */
export const galleryImages: GalleryImage[] = (() => {
  if (!fs.existsSync(GALLERY_DIR)) return [];

  const meta = loadMeta();
  const files = fs
    .readdirSync(GALLERY_DIR)
    .filter((name) => IMAGE_EXT.test(name))
    .sort((a, b) => {
      const aTime = fs.statSync(path.join(GALLERY_DIR, a)).mtimeMs;
      const bTime = fs.statSync(path.join(GALLERY_DIR, b)).mtimeMs;
      return bTime - aTime;
    });

  const useWideLayout = files.length === 1;

  return files.map((name) => {
    const entry = meta[name] ?? {};
    const fallback = titleFromFilename(name);
    return {
      src: `/gallery/${name}`,
      alt: entry.alt ?? fallback,
      caption: entry.caption ?? fallback,
      wide: entry.wide ?? useWideLayout,
    };
  });
})();

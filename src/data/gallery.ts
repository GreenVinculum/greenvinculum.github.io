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

type GalleryJsonItem = {
  file?: string;
  caption?: string;
  alt?: string;
  wide?: boolean;
};

type GalleryJsonRoot = {
  items?: GalleryJsonItem[];
} & Record<string, GalleryMetaEntry | GalleryJsonItem[] | undefined>;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const META_PATH = path.join(GALLERY_DIR, "gallery.json");

const titleFromFilename = (filename: string) =>
  filename
    .replace(/\.[^.]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const fileExists = (filename: string) =>
  fs.existsSync(path.join(GALLERY_DIR, filename));

const loadMeta = (): GalleryJsonRoot => {
  if (!fs.existsSync(META_PATH)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
};

/** Load gallery images (call from page frontmatter so json/file changes apply on rebuild). */
export const loadGalleryImages = (): GalleryImage[] => {
  if (!fs.existsSync(GALLERY_DIR)) return [];

  const meta = loadMeta();
  const diskImages = fs
    .readdirSync(GALLERY_DIR)
    .filter((name) => IMAGE_EXT.test(name));

  const items = meta.items;
  if (Array.isArray(items) && items.length > 0) {
    const listed: GalleryImage[] = [];
    for (const item of items) {
      const file = item.file?.trim();
      if (!file || !IMAGE_EXT.test(file)) continue;
      if (!fileExists(file)) continue;
      const fallback = titleFromFilename(file);
      listed.push({
        src: `/gallery/${file}`,
        alt: item.alt ?? fallback,
        caption: item.caption ?? fallback,
        wide: item.wide ?? (listed.length === 0 && items.length === 1),
      });
    }
    if (listed.length > 0) return listed;
  }

  const files = diskImages.sort((a, b) => {
    const aTime = fs.statSync(path.join(GALLERY_DIR, a)).mtimeMs;
    const bTime = fs.statSync(path.join(GALLERY_DIR, b)).mtimeMs;
    return bTime - aTime;
  });

  const useWideLayout = files.length === 1;

  return files.map((name) => {
    const entry = (meta[name] as GalleryMetaEntry | undefined) ?? {};
    const fallback = titleFromFilename(name);
    return {
      src: `/gallery/${name}`,
      alt: entry.alt ?? fallback,
      caption: entry.caption ?? fallback,
      wide: entry.wide ?? useWideLayout,
    };
  });
};

/** Genres for books-read.json and the blog read log charts. */
export const BOOK_GENRES = [
  "LitRPG",
  "Science Fiction",
  "Fantasy",
  "Horror",
  "Mystery",
  "Literary Fiction",
  "Non-fiction",
  "Graphic Novel",
  "Manga",
  "Technical",
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];

export const GENRE_COLORS: Record<BookGenre, string> = {
  LitRPG: "#34d399",
  "Science Fiction": "#60a5fa",
  Fantasy: "#c084fc",
  Horror: "#f87171",
  Mystery: "#fbbf24",
  "Literary Fiction": "#fb923c",
  "Non-fiction": "#94a3b8",
  "Graphic Novel": "#f472b6",
  Manga: "#a78bfa",
  Technical: "#22d3ee",
};

export type ReadingBook = {
  id: string;
  title: string;
  series?: string;
  bookNumber?: number;
  author: string;
  synopsis: string;
  coverSrc: string;
  coverAlt: string;
  url: string;
  genres: BookGenre[];
};

export type ReadLogEntry = {
  genres: BookGenre[];
};

export type ReadLogSegment = { genre: BookGenre; count: number };

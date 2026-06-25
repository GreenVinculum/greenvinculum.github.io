/** Book genres — used for the read tally widget on the blog page. */
export const BOOK_GENRES = [
  "LitRPG",
  "Science Fiction",
  "Fantasy",
  "Horror",
  "Mystery",
  "Literary Fiction",
  "Non-fiction",
  "Technical",
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];

/** Bar color per genre in the read log widget. */
export const GENRE_COLORS: Record<BookGenre, string> = {
  LitRPG: "#34d399",
  "Science Fiction": "#60a5fa",
  Fantasy: "#c084fc",
  Horror: "#f87171",
  Mystery: "#fbbf24",
  "Literary Fiction": "#fb923c",
  "Non-fiction": "#94a3b8",
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

/** One finished book — only genres are shown in the public read log. */
export type ReadLogEntry = {
  genres: BookGenre[];
};

/**
 * Active title on the blog page.
 * When you finish a book: push `{ genres: [...] }` onto booksRead, then update currentlyReading.
 */
export const currentlyReading: ReadingBook = {
  id: "dcc-8",
  title: "A Parade of Horribles",
  series: "Dungeon Crawler Carl",
  bookNumber: 8,
  author: "Matt Dinniman",
  synopsis:
    "Carl and the surviving crawlers enter open faction warfare on the dungeon's upper floors — galactic politics, sponsored armies, and gods turn the crawl into a regulated fight to the last team standing.",
  coverSrc: "/images/dcc-book8-cover.jpg",
  coverAlt: "Cover of A Parade of Horribles by Matt Dinniman",
  url: "https://en.wikipedia.org/wiki/Dungeon_Crawler_Carl",
  genres: ["LitRPG", "Science Fiction"],
};

/** Finished books — genres only (titles stay private). Newest last when you append. */
export const booksRead: ReadLogEntry[] = [
  { genres: ["LitRPG", "Science Fiction"] },
  { genres: ["LitRPG", "Science Fiction"] },
  { genres: ["LitRPG", "Science Fiction", "Horror"] },
  { genres: ["LitRPG", "Science Fiction"] },
  { genres: ["LitRPG", "Science Fiction"] },
  { genres: ["LitRPG", "Science Fiction", "Horror"] },
  { genres: ["LitRPG", "Science Fiction"] },
];

export function tallyBookGenres(books: ReadLogEntry[]): { genre: BookGenre; count: number }[] {
  const counts = new Map<BookGenre, number>();
  for (const book of books) {
    for (const genre of book.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

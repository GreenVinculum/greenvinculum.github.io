import { booksReadCatalog } from "./books-read";
import {
  type BookGenre,
  type ReadLogEntry,
  type ReadLogSegment,
  type ReadingBook,
  GENRE_COLORS,
  BOOK_GENRES,
} from "./currentlyReading-genres";

export {
  BOOK_GENRES,
  GENRE_COLORS,
  type BookGenre,
  type ReadingBook,
  type ReadLogEntry,
  type ReadLogSegment,
};
export { booksReadCatalog, type BooksReadRecord } from "./books-read";
/**
 * Active title on the blog page.
 * When you finish a book: add an entry to src/data/books-read.json, then update currentlyReading.
 */
export const currentlyReading: ReadingBook = {
  id: "dust-silo",
  title: "Dust",
  series: "Silo",
  bookNumber: 3,
  author: "Hugh Howey",
  synopsis:
    "The finale of the Silo trilogy. Wool introduced the underground world; Shift told how it was built. Dust follows Juliette and Donald as the silos' carefully managed order starts to come apart — and asks what it costs to let a new world begin.",
  coverSrc: "https://covers.openlibrary.org/b/isbn/9780544838260-L.jpg",
  coverAlt: "Cover of Dust by Hugh Howey",
  url: "https://en.wikipedia.org/wiki/Dust_(novel)",
  genres: ["Science Fiction"],
};

/** Derived from books-read.json for the read log charts. */
export const booksRead: ReadLogEntry[] = booksReadCatalog.map(({ genres }) => ({ genres }));

export function tallyBookGenres(books: ReadLogEntry[]): { genre: BookGenre; count: number }[] {  const counts = new Map<BookGenre, number>();
  for (const book of books) {
    for (const genre of book.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

/** Tally genre tags for a filtered slice of the read log (optionally drop wrapper genres). */
export function tallyReadLogSegments(  books: ReadLogEntry[],
  options: {
    includeIf: (entry: ReadLogEntry) => boolean;
    omitGenres?: BookGenre[];
  }
): ReadLogSegment[] {
  const omit = new Set(options.omitGenres ?? []);
  const counts = new Map<BookGenre, number>();
  for (const book of books) {
    if (!options.includeIf(book)) continue;
    for (const genre of book.genres) {
      if (omit.has(genre)) continue;
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export function tallyVisualMediaByGenre(books: ReadLogEntry[]): ReadLogSegment[] {
  return tallyReadLogSegments(books, {
    includeIf: (entry) =>
      entry.genres.includes("Manga") || entry.genres.includes("Graphic Novel"),
    omitGenres: ["Manga", "Graphic Novel"],
  });
}

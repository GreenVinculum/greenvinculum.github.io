import rawBooks from "./books-read.json";
import { BOOK_GENRES, type BookGenre } from "./currentlyReading-genres";

export type BooksReadRecord = {
  title: string;
  author: string;
  genres: BookGenre[];
  series?: string;
  bookNumber?: number;
};

const genreSet = new Set<string>(BOOK_GENRES);

function isBookGenre(value: string): value is BookGenre {
  return genreSet.has(value);
}

function parseBooksRead(data: unknown): BooksReadRecord[] {
  if (!Array.isArray(data)) {
    throw new Error("books-read.json must be a JSON array.");
  }

  return data.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`books-read.json entry ${index} must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const title = record.title;
    const author = record.author;
    const genres = record.genres;

    if (typeof title !== "string" || !title.trim()) {
      throw new Error(`books-read.json entry ${index} needs a non-empty "title".`);
    }
    if (typeof author !== "string" || !author.trim()) {
      throw new Error(`books-read.json entry ${index} needs a non-empty "author".`);
    }
    if (!Array.isArray(genres) || genres.length === 0) {
      throw new Error(`books-read.json entry ${index} needs at least one genre in "genres".`);
    }

    const parsedGenres = genres.map((genre, genreIndex) => {
      if (typeof genre !== "string" || !isBookGenre(genre)) {
        throw new Error(
          `books-read.json entry ${index} has invalid genre at index ${genreIndex}: ${String(genre)}`
        );
      }
      return genre;
    });

    const book: BooksReadRecord = {
      title: title.trim(),
      author: author.trim(),
      genres: parsedGenres,
    };

    if (record.series !== undefined) {
      if (typeof record.series !== "string" || !record.series.trim()) {
        throw new Error(`books-read.json entry ${index} has an invalid "series".`);
      }
      book.series = record.series.trim();
    }

    if (record.bookNumber !== undefined) {
      if (typeof record.bookNumber !== "number" || !Number.isInteger(record.bookNumber)) {
        throw new Error(`books-read.json entry ${index} has an invalid "bookNumber".`);
      }
      book.bookNumber = record.bookNumber;
    }

    return book;
  });
}

/** Edit src/data/books-read.json — append one object per finished book. */
export const booksReadCatalog: BooksReadRecord[] = parseBooksRead(rawBooks);

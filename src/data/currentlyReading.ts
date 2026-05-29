export type CurrentlyReadingBook = {
  title: string;
  series: string;
  bookNumber: number;
  author: string;
  synopsis: string;
  coverSrc: string;
  coverAlt: string;
  url: string;
};

export const currentlyReading: CurrentlyReadingBook = {
  title: "A Parade of Horribles",
  series: "Dungeon Crawler Carl",
  bookNumber: 8,
  author: "Matt Dinniman",
  synopsis:
    "Carl and the surviving crawlers enter open faction warfare on the dungeon’s upper floors — galactic politics, sponsored armies, and gods turn the crawl into a regulated fight to the last team standing.",
  coverSrc: "/images/dcc-book8-cover.jpg",
  coverAlt: "Cover of A Parade of Horribles by Matt Dinniman",
  url: "https://en.wikipedia.org/wiki/Dungeon_Crawler_Carl",
};

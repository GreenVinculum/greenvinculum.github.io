/** Edit this list — up to three games shown on the blog page. */
export type CurrentlyPlayingGame = {
  title: string;
  platform: string;
  note: string;
  coverSrc: string;
  coverAlt: string;
  url?: string;
};

export const currentlyPlaying: CurrentlyPlayingGame[] = [
  {
    title: "Balatro",
    platform: "Steam Deck",
    note: "One more run before I put the Deck down.",
    coverSrc: "/images/games/balatro.jpg",
    coverAlt: "Balatro cover art",
    url: "https://store.steampowered.com/app/2379780/Balatro/",
  },
  {
    title: "Dave the Diver",
    platform: "Steam Deck",
    note: "Evening dives and sushi shifts.",
    coverSrc: "/images/games/dave-the-diver.jpg",
    coverAlt: "Dave the Diver cover art",
    url: "https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/",
  },
  {
    title: "Hollow Knight",
    platform: "Nintendo Switch",
    note: "Hallownest map completion on the couch.",
    coverSrc: "/images/games/hollow-knight.jpg",
    coverAlt: "Hollow Knight cover art",
    url: "https://store.steampowered.com/app/367520/Hollow_Knight/",
  },
];

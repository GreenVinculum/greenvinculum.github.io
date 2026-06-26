/** Arcade cartridges in the hidden Universe — extend when games ship. */
export type UniverseGame = {
  slug: string;
  title: string;
  tagline: string;
  decade?: string;
  available: boolean;
  href?: string;
};

export const UNIVERSE_GAMES: UniverseGame[] = [
  {
    slug: "tetris",
    title: "Tetris",
    tagline: "Stack the falling blocks.",
    decade: "1984",
    available: false,
  },
  {
    slug: "snake",
    title: "Snake",
    tagline: "Grow without biting yourself.",
    available: false,
  },
  {
    slug: "breakout",
    title: "Breakout",
    tagline: "Bounce, break, repeat.",
    decade: "1976",
    available: false,
  },
  {
    slug: "asteroids",
    title: "Asteroids",
    tagline: "Vector survival in deep space.",
    decade: "1979",
    available: false,
  },
  {
    slug: "pong",
    title: "Pocket Tennis",
    tagline: "Two paddles, one ball — first to 21.",
    decade: "1972",
    available: true,
    href: "/pocket-universe-x/tennis/",
  },
  {
    slug: "pac",
    title: "Pac-Maze",
    tagline: "Dots, ghosts, narrow escapes.",
    available: false,
  },
];

/** Edit this list — up to three games shown on the blog page. */
export type CurrentlyPlayingGame = {
  title: string;
  platform: string;
  note: string;
  coverSrc?: string;
  coverAlt?: string;
  url?: string;
};

export const currentlyPlaying: CurrentlyPlayingGame[] = [
  {
    title: "Welcome to Elderfield",
    platform: "Steam Deck",
    note: "Cozy horror farm days, Old Gods at night.",
    coverSrc:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3195440/49d893d1f030279f33e27f3e5074853476c4030f/library_capsule_2x.jpg",
    coverAlt: "Welcome to Elderfield cover art",
    url: "https://store.steampowered.com/app/3195440/Welcome_to_Elderfield/",
  },
  {
    title: "Octopath Traveler",
    platform: "Nintendo Switch",
    note: "First game — eight travelers, one HD-2D road.",
    coverSrc: "/images/games/octopath-traveler.jpg",
    coverAlt: "Octopath Traveler cover art",
    url: "https://www.nintendo.com/us/store/products/octopath-traveler-switch/",
  },
  {
    title: "Balatro",
    platform: "Steam Deck",
    note: "One more run before I put the Deck down.",
    coverSrc: "/images/games/balatro.jpg",
    coverAlt: "Balatro cover art",
    url: "https://store.steampowered.com/app/2379780/Balatro/",
  },
];

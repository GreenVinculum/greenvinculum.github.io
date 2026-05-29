export type PortfolioProject = {
  title: string;
  img: string;
  desc: string;
  url: string;
  badge?: string;
  target?: "_self" | "_blank";
};

/** Full lists live on /portfolio/research and /portfolio/personal */
export const recentPortfolioProjects: PortfolioProject[] = [
  {
    title: "Teleoperated 360 Video Capture of Beehives for Scientific Visualization in VR",
    img: "/portfolio/research-projects/vrst25beevr/assets/images/teasruser.webp",
    desc: "Framework for capturing and analyzing bee activity with 360° cameras and hardware for immersive VR visualization.",
    url: "/portfolio/research-projects/vrst25beevr/index.html",
    badge: "NEW",
  },
  {
    title: "Stellar Slither",
    img: "/portfolio/personal-projects/stellar-slither/hero.svg",
    desc: "Snake game on a Stellar Unicorn matrix with an Adafruit Qwiic Gamepad.",
    url: "/portfolio/personal/stellar-slither",
    target: "_self",
  },
  {
    title: "MintyPii",
    img: "/portfolio/personal-projects/mintypii/hero.svg",
    desc: "Pocket iPod-style player in an Altoids tin — Pi Zero 2 W, Pimoroni Headphone HAT, and a rotary dial.",
    url: "/portfolio/personal/mintypii",
    target: "_self",
  },
];

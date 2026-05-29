export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  wide?: boolean;
};

/** Add images under public/gallery/ and list them here. */
export const galleryImages: GalleryImage[] = [
  {
    src: "/post_img.webp",
    alt: "Project still",
    caption: "Project still",
  },
  {
    src: "/portfolio/research-projects/vrst25beevr/assets/images/teasruser.webp",
    alt: "Teleoperated 360° beehive capture in VR",
    caption: "Beehive VR research",
    wide: true,
  },
];

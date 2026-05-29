/* empty css                                  */
import { c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead, f as addAttribute } from '../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Cy-nVMIJ.mjs';
export { renderers } from '../renderers.mjs';

const galleryImages = [
  {
    src: "/post_img.webp",
    alt: "Project still",
    caption: "Project still"
  },
  {
    src: "/portfolio/research-projects/vrst25beevr/assets/images/teasruser.webp",
    alt: "Teleoperated 360° beehive capture in VR",
    caption: "Beehive VR research",
    wide: true
  }
];

const $$Gallery = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Gallery", "sideBarActiveItemID": "gallery" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <h1 class="text-3xl font-bold mb-2">Gallery</h1> <p class="text-base-content/75 max-w-2xl">Photos and image work. Add files to <code class="text-sm">public/gallery/</code> and update <code class="text-sm">src/data/gallery.ts</code>.</p> </div> <ul class="gallery-grid"> ${galleryImages.map((item) => renderTemplate`<li${addAttribute(["gallery-grid__item", item.wide && "gallery-grid__item--wide"], "class:list")}> <figure class="gallery-card"> <a class="gallery-card__link"${addAttribute(item.src, "href")} target="_blank" rel="noopener noreferrer"> <img class="gallery-card__img"${addAttribute(item.src, "src")}${addAttribute(item.alt, "alt")} loading="lazy" decoding="async"${addAttribute(item.wide ? 900 : 480, "width")}${addAttribute(item.wide ? 520 : 480, "height")}> </a> ${item.caption && renderTemplate`<figcaption class="gallery-card__caption">${item.caption}</figcaption>`} </figure> </li>`)} </ul> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/gallery.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/gallery.astro";
const $$url = "/gallery";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Gallery,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

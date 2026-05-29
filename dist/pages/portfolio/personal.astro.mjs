/* empty css                                     */
import { c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Cy-nVMIJ.mjs';
import { $ as $$HorizontalCard } from '../../chunks/HorizontalCard_BZ5NaDlg.mjs';
export { renderers } from '../../renderers.mjs';

const $$Personal = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Personal Projects", "sideBarActiveItemID": "portfolioPersonal" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-4 mb-5"> <div class="text-3xl w-full font-bold">Personal Projects</div> </div> <div class="mt-5"> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Altoids Tin Music Player", "img": "/portfolio/personal-projects/altoids-ipod/hero.svg", "desc": "iPod-inspired pocket player: Raspberry Pi Zero 2 W, Pimoroni Headphone HAT, Inland rotary dial, all inside an Altoids mint tin.", "url": "/portfolio/personal/altoids-ipod", "target": "_self" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Personal Site Iteration", "img": "/post_img.webp", "desc": "Evolving portfolio design system with responsive sections, custom theming, and narrative structure.", "url": "#" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Weekend IoT Sensor Rig", "img": "/post_img.webp", "desc": "A compact sensor and logging setup for outdoor experiments and data review.", "url": "#" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Unity Prototype Collection", "img": "/post_img.webp", "desc": "Rapid gameplay and interaction experiments focused on novel interfaces.", "url": "#" })} </div> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal.astro";
const $$url = "/portfolio/personal";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Personal,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

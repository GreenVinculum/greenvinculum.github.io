/* empty css                                  */
import { e as createAstro, c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Cy-nVMIJ.mjs';
import { $ as $$HorizontalCard } from '../chunks/HorizontalCard_BZ5NaDlg.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://greenvinculum.github.io/");
const $$Portfolio = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Portfolio;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Portfolio", "sideBarActiveItemID": "portfolio" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-4 mb-5"> <div class="text-3xl w-full font-bold">Portfolio</div> <p class="text-base-content/75 max-w-2xl">Selected recent work across research and personal builds.</p> </div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Teleoperated 360 Video Capture of Beehives for Scientific Visualization in VR", "img": "/portfolio/research-projects/vrst25beevr/assets/images/teasruser.webp", "desc": "This project provides a framework for capturing and analyzing bee activity using commercially available 360\u25E6 cameras and hardware to create an immersive VR experience.", "url": "/portfolio/research-projects/vrst25beevr/index.html", "badge": "NEW" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Social XR Interface Study", "img": "/post_img.webp", "desc": "Prototype and evaluate collaborative virtual workflows for distributed teams.", "url": "#" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Altoids Tin Music Player", "img": "/portfolio/personal-projects/altoids-ipod/hero.svg", "desc": "Pocket iPod-style player with Pi Zero 2 W, Pimoroni Headphone HAT, and a rotary dial in an Altoids tin.", "url": "/portfolio/personal/altoids-ipod", "target": "_self", "badge": "NEW" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Personal Site Iteration", "img": "/post_img.webp", "desc": "Built an Astro-powered portfolio focused on speed, accessibility, and clear storytelling.", "url": "#" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Weekend IoT Sensor Rig", "img": "/post_img.webp", "desc": "Low-cost environmental monitor with custom enclosure and dashboard logging.", "url": "#" })} ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio.astro";
const $$url = "/portfolio";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Portfolio,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

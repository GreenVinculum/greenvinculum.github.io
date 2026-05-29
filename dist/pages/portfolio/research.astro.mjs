/* empty css                                     */
import { c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Cy-nVMIJ.mjs';
import { $ as $$HorizontalCard } from '../../chunks/HorizontalCard_BZ5NaDlg.mjs';
export { renderers } from '../../renderers.mjs';

const $$Research = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Research Portfolio", "sideBarActiveItemID": "portfolioResearch" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-4 mb-5"> <div class="text-3xl w-full font-bold">Research Projects</div> </div> <div class="mt-5"> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Teleoperated 360 Video Capture of Beehives for Scientific Visualization in VR", "img": "/portfolio/research-projects/vrst25beevr/assets/images/teasruser.webp", "desc": "Framework for capturing and analyzing bee activity with commercial 360 cameras and immersive VR replay.", "url": "/portfolio/research-projects/vrst25beevr/index.html", "badge": "NEW" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Social XR Interface Study", "img": "/post_img.webp", "desc": "Comparative study of interaction methods for synchronous collaboration in XR.", "url": "#" })} <div class="divider my-0"></div> ${renderComponent($$result2, "HorizontalCard", $$HorizontalCard, { "title": "Human-Robot Teaming Prototype", "img": "/post_img.webp", "desc": "Interactive prototype exploring role negotiation between humans and assistive robots.", "url": "#" })} </div> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/research.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/research.astro";
const $$url = "/portfolio/research";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Research,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

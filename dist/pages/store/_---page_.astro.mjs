/* empty css                                     */
import { e as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, r as renderComponent, d as renderTemplate, F as Fragment } from '../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { a as $$Image, $ as $$BaseLayout } from '../../chunks/BaseLayout_Cy-nVMIJ.mjs';
import '@astrojs/internal-helpers/path';
import { g as getCollection } from '../../chunks/_astro_content_Bb086paJ.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro$1 = createAstro("https://greenvinculum.github.io/");
const $$HorizontalShopItem = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$HorizontalShopItem;
  const {
    title,
    img,
    desc,
    url,
    badge,
    pricing,
    oldPricing,
    checkoutUrl,
    details = true,
    custom_link = false,
    custom_link_label = ""
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="rounded-lg bg-base-100 hover:shadow-xl transition ease-in-out hover:scale-[102%]"> <a${addAttribute(url, "href")}> <div class="hero-content flex-col md:flex-row"> ${img && renderTemplate`${renderComponent($$result, "Image", $$Image, { "width": 750, "height": 422, "format": "webp", "src": img, "alt": title, "class": "max-w-full md:max-w-[13rem] rounded-lg" })}`} <div class="grow w-full p-5 md:p-0"> <h1 class="text-xl font-bold"> ${title} ${badge && renderTemplate`<div class="badge badge-secondary mx-2">${badge}</div>`} </h1> <div> <span class="text-xl mr-1"> ${pricing}</span> <span class="text-md opacity-50 line-through">${oldPricing}</span> </div> <p class="py-1 text-1xl">${desc}</p> </div> </div> </a> </div>`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/HorizontalShopItem.astro", void 0);

const $$Astro = createAstro("https://greenvinculum.github.io/");
async function getStaticPaths({ paginate }) {
  const items = await getCollection("store");
  items.sort((a, b) => b.data.updatedDate.valueOf() - a.data.updatedDate.valueOf());
  return paginate(items, { pageSize: 10 });
}
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const { page } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Store", "sideBarActiveItemID": "store" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<ul> ${page.data.map((item) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` ${renderComponent($$result3, "HorizontalShopItem", $$HorizontalShopItem, { "title": item.data.title, "img": item.data.heroImage, "desc": item.data.description, "pricing": item.data.pricing, "oldPricing": item.data.oldPricing, "checkoutUrl": item.data.checkoutUrl, "badge": item.data.badge, "details": item.data.details, "tags": item.data.tags, "url": "/store/" + item.slug, "custom_link": item.data.custom_link, "custom_link_label": item.data.custom_link_label })} <div class="divider my-0"></div> ` })}`)} </ul> <div class="flex justify-between"> ${page.url.prev ? renderTemplate`<a${addAttribute(page.url.prev, "href")} class="btn btn-ghost my-10 mx-5"> ${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"></path> </svg>${" "}
Previous page
</a>` : renderTemplate`<div></div>`} ${page.url.next ? renderTemplate`<a${addAttribute(page.url.next, "href")} class="btn btn-ghost my-10 mx-5">
Next page${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> ${" "} <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path> </svg> </a>` : renderTemplate`<div></div>`} </div> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/store/[...page].astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/store/[...page].astro";
const $$url = "/store/[...page]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

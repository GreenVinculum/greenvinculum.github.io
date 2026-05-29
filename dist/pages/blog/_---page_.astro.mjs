/* empty css                                     */
import { c as createComponent, m as maybeRenderHead, f as addAttribute, d as renderTemplate, e as createAstro, r as renderComponent, F as Fragment } from '../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Cy-nVMIJ.mjs';
import 'clsx';
import { $ as $$HorizontalCard } from '../../chunks/HorizontalCard_BZ5NaDlg.mjs';
import { g as getCollection } from '../../chunks/_astro_content_Bb086paJ.mjs';
import { c as createSlug } from '../../chunks/createSlug_D-iatWqU.mjs';
export { renderers } from '../../renderers.mjs';

const currentlyReading = {
  title: "A Parade of Horribles",
  series: "Dungeon Crawler Carl",
  bookNumber: 8,
  author: "Matt Dinniman",
  coverSrc: "/images/dcc-book8-cover.jpg",
  coverAlt: "Cover of A Parade of Horribles by Matt Dinniman",
  url: "https://en.wikipedia.org/wiki/Dungeon_Crawler_Carl"
};

const $$CurrentlyReading = createComponent(($$result, $$props, $$slots) => {
  const { title, series, bookNumber, author, coverSrc, coverAlt, url } = currentlyReading;
  return renderTemplate`${maybeRenderHead()}<aside class="currently-reading mb-8" aria-label="Currently reading"> <p class="text-sm font-semibold uppercase tracking-wide text-base-content/70 mb-2">
Currently reading
</p> <a${addAttribute(url, "href")} target="_blank" rel="noopener noreferrer" class="currently-reading-link group flex gap-4 items-start rounded-lg bg-base-200/80 border border-base-300 p-4 transition ease-in-out hover:shadow-lg hover:scale-[101%] no-underline"> <img${addAttribute(coverSrc, "src")}${addAttribute(coverAlt, "alt")} width="96" height="144" loading="lazy" class="currently-reading-cover shrink-0 w-20 sm:w-24 rounded-md shadow-md ring-1 ring-base-300/60 object-cover"> <div class="min-w-0 pt-1"> <p class="text-xs text-base-content/60 mb-1"> ${series} · Book ${bookNumber} </p> <p class="text-lg font-bold text-base-content leading-snug group-hover:text-secondary transition-colors"> ${title} </p> <p class="text-sm text-base-content/70 mt-1">${author}</p> </div> </a> </aside>`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/CurrentlyReading.astro", void 0);

const $$Astro = createAstro("https://greenvinculum.github.io/");
async function getStaticPaths({ paginate }) {
  const posts = await getCollection("blog");
  posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return paginate(posts, { pageSize: 10 });
}
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const { page } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Blog", "sideBarActiveItemID": "blog" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-5"> <div class="text-3xl w-full font-bold">Blog</div> </div> ${renderComponent($$result2, "CurrentlyReading", $$CurrentlyReading, {})} ${page.data.length === 0 ? renderTemplate`<div class="bg-base-200 border-l-4 border-secondary w-full p-4 min-w-full"> <p class="font-bold">Sorry!</p> <p>There are no blog posts to show at the moment. Check back later!</p> </div>` : renderTemplate`<ul> ${page.data.map((post) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` ${renderComponent($$result3, "HorizontalCard", $$HorizontalCard, { "title": post.data.title, "img": post.data.heroImage, "desc": post.data.description, "url": "/blog/" + createSlug(post.data.title, post.slug), "target": "_self", "badge": post.data.badge, "tags": post.data.tags })} <div class="divider my-0"></div> ` })}`)} </ul>`}<div class="flex justify-between"> ${page.url.prev ? renderTemplate`<a${addAttribute(page.url.prev, "href")} class="btn btn-ghost my-10 mx-5"> ${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"></path> </svg>${" "}
Recent posts
</a>` : renderTemplate`<div></div>`} ${page.url.next ? renderTemplate`<a${addAttribute(page.url.next, "href")} class="btn btn-ghost my-10 mx-5">
Older Posts${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> ${" "} <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path> </svg> </a>` : renderTemplate`<div></div>`} </div> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/[...page].astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/[...page].astro";
const $$url = "/blog/[...page]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

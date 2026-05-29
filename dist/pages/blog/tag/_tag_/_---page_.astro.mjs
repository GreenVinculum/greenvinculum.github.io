/* empty css                                           */
import { e as createAstro, c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead, F as Fragment, f as addAttribute } from '../../../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../../../../chunks/BaseLayout_Cy-nVMIJ.mjs';
import { $ as $$HorizontalCard } from '../../../../chunks/HorizontalCard_BZ5NaDlg.mjs';
import { g as getCollection } from '../../../../chunks/_astro_content_Bb086paJ.mjs';
import { c as createSlug } from '../../../../chunks/createSlug_D-iatWqU.mjs';
export { renderers } from '../../../../renderers.mjs';

const $$Astro = createAstro("https://greenvinculum.github.io/");
async function getStaticPaths({ paginate }) {
  const all_posts = await getCollection("blog");
  const all_tags = all_posts.flatMap((post) => {
    return post.data.tags || [];
  });
  return all_tags.flatMap((tag) => {
    const filtred_posts = all_posts.filter((post) => {
      return post.data.tags?.includes(tag);
    });
    return paginate(filtred_posts, {
      params: { tag },
      pageSize: 10
    });
  });
}
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const { page } = Astro2.props;
  const params = Astro2.params;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Blog - " + params.tag, "sideBarActiveItemID": "blog" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-5"> <div class="text-3xl w-full font-bold">Blog - ${params.tag}</div> </div> ${page.data.length === 0 ? renderTemplate`<div class="bg-base-200 border-l-4 border-secondary w-full p-4 min-w-full"> <p class="font-bold">Sorry!</p> <p>There are no blog posts to show at the moment. Check back later!</p> </div>` : renderTemplate`<ul> ${page.data.map((post) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` ${renderComponent($$result3, "HorizontalCard", $$HorizontalCard, { "title": post.data.title, "img": post.data.heroImage, "desc": post.data.description, "url": "/blog/" + createSlug(post.data.title, post.slug), "target": "_self", "badge": post.data.badge, "tags": post.data.tags })} <div class="divider my-0"></div> ` })}`)} </ul>`}<div class="flex justify-between"> ${page.url.prev ? renderTemplate`<a${addAttribute(page.url.prev, "href")} class="btn btn-ghost my-10 mx-5"> ${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"></path> </svg>${" "}
Recent posts
</a>` : renderTemplate`<div></div>`} ${page.url.next ? renderTemplate`<a${addAttribute(page.url.next, "href")} class="btn btn-ghost my-10 mx-5">
Older Posts${" "} <svg class="h-6 w-6 fill-current md:h-8 md:w-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"> ${" "} <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path> </svg> </a>` : renderTemplate`<div></div>`} </div> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/tag/[tag]/[...page].astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/blog/tag/[tag]/[...page].astro";
const $$url = "/blog/tag/[tag]/[...page]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

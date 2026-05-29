import { e as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, g as renderSlot, d as renderTemplate } from './astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import 'clsx';

const $$Astro = createAstro("https://greenvinculum.github.io/");
const $$NerveTimeline = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$NerveTimeline;
  const { idPrefix, class: className = "", syncGlitch = false, rngSeedOffset = 0 } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["news-timeline", "news-timeline__viz", className], "class:list")}${addAttribute(`${idPrefix}Viz`, "id")}${addAttribute(idPrefix, "data-nerve-prefix")}${addAttribute(syncGlitch ? "1" : "0", "data-sync-glitch")}${addAttribute(String(rngSeedOffset), "data-rng-seed")}> <svg class="news-timeline__svg"${addAttribute(`${idPrefix}Svg`, "id")} aria-hidden="true"> <g${addAttribute(`${idPrefix}Wire`, "id")} class="news-timeline__wire"> <g${addAttribute(`${idPrefix}Mesh`, "id")} class="news-timeline__mesh"></g> <g${addAttribute(`${idPrefix}Events`, "id")} class="news-timeline__events"></g> <g${addAttribute(`${idPrefix}Glitch`, "id")} class="news-timeline__glitch"></g> </g> </svg> <div class="news-timeline__clouds"${addAttribute(`${idPrefix}Clouds`, "id")} aria-hidden="true"></div> <div class="news-timeline__items"> ${renderSlot($$result, $$slots["default"])} </div> </div> `;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/NerveTimeline.astro", void 0);

export { $$NerveTimeline as $ };

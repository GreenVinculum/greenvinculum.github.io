/* empty css                                  */
import { e as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, g as renderSlot, d as renderTemplate, r as renderComponent } from '../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Cy-nVMIJ.mjs';
import { $ as $$NerveTimeline } from '../chunks/NerveTimeline_C7i5Hq7t.mjs';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro$2 = createAstro("https://greenvinculum.github.io/");
const $$TimeLine = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$TimeLine;
  const { title, subtitle, isCurrent = false } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<article class="news-item timeline-reveal is-faded"${addAttribute(isCurrent ? "true" : void 0, "data-current")}> <div class="news-node" aria-hidden="true"></div> <div class="news-item__body"> <h3 class="font-semibold mb-1">${title}</h3> <span class="font-light text-sm block opacity-80">${subtitle}</span> <div class="my-2 text-justify"> ${renderSlot($$result, $$slots["default"])} </div> </div> </article>`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/cv/TimeLine.astro", void 0);

const $$Astro$1 = createAstro("https://greenvinculum.github.io/");
const $$SkillMeter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SkillMeter;
  const { name, target } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="skill-meter"> <div class="skill-meter-head"><span>${name}</span><span class="skill-meter-pct">0%</span></div> <div class="skill-meter-track"> <div class="skill-meter-signal"> <span class="skill-meter-rgb skill-meter-rgb--a" aria-hidden="true"></span> <span class="skill-meter-rgb skill-meter-rgb--b" aria-hidden="true"></span> <span class="skill-meter-slice" aria-hidden="true"></span> <span class="skill-meter-static" aria-hidden="true"></span> <div class="skill-meter-fill"${addAttribute(target, "data-target")}></div> </div> <span class="skill-meter-scan" aria-hidden="true"></span> </div> </div>`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/cv/SkillMeter.astro", void 0);

const $$Astro = createAstro("https://greenvinculum.github.io/");
const $$SkillTabs = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SkillTabs;
  const { groups } = Astro2.props;
  const tabPrefix = "skill-tab";
  const panelPrefix = "skill-panel";
  return renderTemplate`${maybeRenderHead()}<div class="skill-tabs" data-skill-tabs> <div class="skill-tabs-list" role="tablist" aria-label="Skill categories"> ${groups.map((group, index) => renderTemplate`<button type="button"${addAttribute(["skill-tab", { "is-active": index === 0 }], "class:list")}${addAttribute(`${tabPrefix}-${group.id}`, "id")} role="tab"${addAttribute(index === 0 ? "true" : "false", "aria-selected")}${addAttribute(`${panelPrefix}-${group.id}`, "aria-controls")}${addAttribute(index === 0 ? 0 : -1, "tabindex")}> ${group.tabLabel} </button>`)} </div> ${groups.map((group, index) => renderTemplate`<div${addAttribute(["skill-tab-panel", { "is-active": index === 0 }], "class:list")}${addAttribute(`${panelPrefix}-${group.id}`, "id")} role="tabpanel"${addAttribute(`${tabPrefix}-${group.id}`, "aria-labelledby")}${addAttribute(index !== 0 ? true : void 0, "hidden")}> <div class="grid gap-4 skill-meters-grid"> ${group.skills.map((skill) => renderTemplate`${renderComponent($$result, "SkillMeter", $$SkillMeter, { "name": skill.name, "target": skill.target })}`)} </div> </div>`)} </div>`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/components/cv/SkillTabs.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Cv = createComponent(($$result, $$props, $$slots) => {
  const skillGroups = [
    {
      id: "programming",
      title: "Programming Languages",
      tabLabel: "Programming",
      skills: [
        { name: "Python", target: 90 },
        { name: "C", target: 99 },
        { name: "C#", target: 80 },
        { name: "MicroPython", target: 76 }
      ]
    },
    {
      id: "data",
      title: "Data & Analysis",
      tabLabel: "Data",
      skills: [
        { name: "SQL", target: 82 },
        { name: "R", target: 72 },
        { name: "Excel", target: 78 }
      ]
    },
    {
      id: "xr-hardware",
      title: "XR, Robotics & Hardware",
      tabLabel: "XR & Hardware",
      skills: [
        { name: "Unity", target: 85 },
        { name: "XR Prototyping", target: 88 },
        { name: "ROS", target: 70 },
        { name: "IoT Systems", target: 78 },
        { name: "Networking", target: 80 },
        { name: "3D Printing", target: 75 }
      ]
    },
    {
      id: "soft-skills",
      title: "Soft Skills",
      tabLabel: "Soft Skills",
      skills: [{ name: "Code Review", target: 86 }]
    },
    {
      id: "spoken",
      title: "Spoken Languages",
      tabLabel: "Languages",
      skills: [
        { name: "English", target: 99 },
        { name: "Spanish", target: 58 },
        { name: "German", target: 38 }
      ]
    }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Resume", "sideBarActiveItemID": "cv" }, { "default": ($$result2) => renderTemplate(_a || (_a = __template([" ", '<div class="max-w-3xl space-y-8"> <section class="cv-section space-y-3"> <h1 class="text-3xl font-bold">CV Snapshot</h1> <p class="text-base-content/80">\nQuick view of my background and current focus. Scroll to reveal major events along the timeline.\n</p> </section> <section class="cv-section space-y-3"> <h2 class="text-2xl font-bold">Major Events Timeline</h2> ', ' </section> <section class="cv-section cv-skills-glitch space-y-4"> <h2 class="text-2xl font-bold">Skills</h2> ', ' </section> </div> <script>\n    const sections = Array.from(document.querySelectorAll(".cv-section"));\n    const reveal = (entry) => {\n      if (entry.isIntersecting) {\n        entry.target.classList.add("is-visible");\n      }\n    };\n\n    const observer = new IntersectionObserver(\n      (entries) => entries.forEach(reveal),\n      {\n        threshold: 0.2,\n        rootMargin: "0px 0px -8% 0px"\n      }\n    );\n\n    sections.forEach((section) => observer.observe(section));\n  <\/script>  '])), maybeRenderHead(), renderComponent($$result2, "NerveTimeline", $$NerveTimeline, { "idPrefix": "cvTimeline", "class": "cv-nerve-timeline", "rngSeedOffset": 42069 }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "TimeLineElement", $$TimeLine, { "title": "PhD in Computer Science", "subtitle": "2025 - Present | George Mason University, Arlington, VA", "isCurrent": true }, { "default": ($$result4) => renderTemplate`
Research at the intersection of interaction design, robotics partnership, and XR systems.
` })} ${renderComponent($$result3, "TimeLineElement", $$TimeLine, { "title": "Research Assistant at DCXR Lab", "subtitle": "May 2022 - Present | FUSE, Arlington, VA" }, { "default": ($$result4) => renderTemplate`
Building XR and fabrication workflows for human-centered computing studies.
` })} ${renderComponent($$result3, "TimeLineElement", $$TimeLine, { "title": "B.S. in Computer Science", "subtitle": "2022 - 2025 | George Mason University, Fairfax, VA" }, { "default": ($$result4) => renderTemplate`
Completed core CS training while contributing to multidisciplinary research projects.
` })} ` }), renderComponent($$result2, "SkillTabs", $$SkillTabs, { "groups": skillGroups })) })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/cv.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/cv.astro";
const $$url = "/cv";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cv,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

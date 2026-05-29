/* empty css                                        */
import { c as createComponent, r as renderComponent, d as renderTemplate, m as maybeRenderHead, f as addAttribute } from '../../../chunks/astro/server_DT4nVU3p.mjs';
import 'kleur/colors';
import { $ as $$BaseLayout } from '../../../chunks/BaseLayout_Cy-nVMIJ.mjs';
export { renderers } from '../../../renderers.mjs';

const $$AltoidsIpod = createComponent(($$result, $$props, $$slots) => {
  const title = "Altoids Tin Music Player";
  const description = "A pocket-sized, iPod-inspired music player built around a Raspberry Pi Zero 2 W, Pimoroni Headphone HAT, and rotary dial \u2014 all packed into an Altoids mint tin.";
  const heroImage = "/portfolio/personal-projects/altoids-ipod/hero.svg";
  const tags = ["Raspberry Pi", "Hardware", "Embedded", "Audio"];
  const parts = [
    { item: "Raspberry Pi Zero 2 W", note: "Main compute \u2014 Wi-Fi for syncing, enough headroom for decoding and UI" },
    { item: "Pimoroni Headphone HAT", note: "DAC + headphone amp on a Zero-sized board" },
    { item: "Inland rotary encoder", note: "Scroll through tracks and menus; press to confirm" },
    { item: "Altoids mint tin", note: "Metal enclosure \u2014 tight, but that is part of the charm" },
    { item: "MicroSD card", note: "OS, player software, and music library" },
    { item: "LiPo battery + charger", note: "Portable power with a small boost/regulator as needed" },
    { item: "Wiring + standoffs", note: "Short jumper wires; nylon standoffs keep boards off the tin walls" }
  ];
  const buildSteps = [
    {
      title: "Define the interaction model",
      body: "The goal was an iPod-like experience without a screen: one rotary control for browsing, a press for select, and immediate audio feedback. Menus stay shallow \u2014 library, playlists, now playing, settings \u2014 so everything is navigable by ear and muscle memory."
    },
    {
      title: "Stack the electronics",
      body: "The Pi Zero 2 W sits at the bottom of the stack with the Pimoroni Headphone HAT on top. The Headphone HAT brings a clean analog path to a 3.5 mm jack mounted at the tin edge. GPIO lines run to the Inland rotary encoder for quadrature scroll and switch input."
    },
    {
      title: "Lay out the tin",
      body: "An Altoids tin is smaller than it looks on paper. Holes were marked for the headphone jack and encoder shaft, then drilled and deburred. Internal standoffs keep the Pi stack centered and prevent shorts against the metal case. A thin liner on the lid helps avoid accidental contact."
    },
    {
      title: "Software and library sync",
      body: "The player indexes local files on the SD card. Tracks can be copied over USB or synced over Wi-Fi when the tin is on the bench. Encoder events map to menu navigation and volume \u2014 rotate to move, click to enter, long-press for back or power options."
    },
    {
      title: "Tune and test",
      body: "With everything closed up, the hard parts are mechanical: encoder feel, jack strain relief, and heat. The build was tested for headphone output level, menu responsiveness, and whether the lid still closes without pressing on the HAT."
    }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description, "sideBarActiveItemID": "portfolioPersonal" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="project-page max-w-[750px]"> <a href="/portfolio/personal" class="text-sm text-base-content/60 hover:text-secondary no-underline">
← Personal projects
</a> <header class="mt-4 mb-8"> <img${addAttribute(heroImage, "src")} alt="Concept illustration of an Altoids tin music player with rotary dial and headphone jack" width="640" height="360" class="w-full rounded-lg border border-base-300 shadow-lg mb-6"> <h1 class="text-4xl font-bold leading-tight mb-3">${title}</h1> <p class="text-lg text-base-content/80 leading-relaxed">${description}</p> <div class="flex flex-wrap gap-2 mt-4"> ${tags.map((tag) => renderTemplate`<span class="badge badge-outline">${tag}</span>`)} </div> </header> <div class="divider"></div> <section class="prose prose-lg max-w-none mb-10"> <h2>Overview</h2> <p>
This is a deliberately impractical, very satisfying build: a music player that fits in an Altoids tin and behaves a bit like a classic iPod. There is no touchscreen — just a rotary dial, headphones, and a library of tracks on the Pi.
</p> <p>
The project started as a weekend hardware exercise: could a Zero 2 W, a proper headphone amp, and one good encoder feel good in the hand? The answer is yes, as long as you respect how little room a mint tin actually has.
</p> </section> <section class="mb-10"> <h2 class="text-2xl font-bold mb-4">Hardware</h2> <div class="overflow-x-auto rounded-lg border border-base-300"> <table class="table table-zebra w-full"> <thead> <tr> <th>Part</th> <th>Role</th> </tr> </thead> <tbody> ${parts.map(({ item, note }) => renderTemplate`<tr> <td class="font-medium whitespace-nowrap">${item}</td> <td>${note}</td> </tr>`)} </tbody> </table> </div> </section> <section class="prose prose-lg max-w-none mb-10"> <h2>Why these parts</h2> <ul> <li> <strong>Raspberry Pi Zero 2 W</strong> — quad-core SoC in a board the size of a stick of gum. Enough for local playback and a lightweight UI loop without needing a display.
</li> <li> <strong>Pimoroni Headphone HAT</strong> — integrates DAC and amplification so headphones sound right; fewer loose modules than wiring a separate amp breakout.
</li> <li> <strong>Inland rotary encoder</strong> — the main input. Detents make scrolling through albums feel tactile, similar to a click wheel stripped down to one control.
</li> <li> <strong>Altoids tin</strong> — iconic enclosure, metal shielding, and a built-in flex when you close the lid. It forces discipline on board height and connector placement.
</li> </ul> </section> <section class="mb-10"> <h2 class="text-2xl font-bold mb-6">Build process</h2> <ol class="space-y-6"> ${buildSteps.map(({ title: stepTitle, body }, index) => renderTemplate`<li class="flex gap-4"> <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-content text-sm font-bold"> ${index + 1} </span> <div> <h3 class="text-lg font-semibold mb-1">${stepTitle}</h3> <p class="text-base-content/80 leading-relaxed">${body}</p> </div> </li>`)} </ol> </section> <section class="prose prose-lg max-w-none mb-10"> <h2>Enclosure notes</h2> <p>
The tin is the product. Every millimeter matters: the Headphone HAT’s jack placement drives where the Pi sits, and the encoder knob needs to clear the lid with the shaft nut tightened. Electrical tape or kapton on the inside walls adds insurance against the metal case.
</p> <p>
A small slot or grommet for charging keeps the tin sealed during normal use. When closed, it reads as a pocket gadget — open it and the stack of green boards inside is the reveal.
</p> </section> <section class="prose prose-lg max-w-none mb-10"> <h2>Challenges</h2> <ul> <li><strong>Height budget</strong> — HAT + Pi + standoffs must stay below the lid ridge. Shaving a fraction of a millimeter off standoffs can be the difference between “closes” and “does not.”</li> <li><strong>Grounding</strong> — metal tin means thoughtful grounding and isolation so the jack and encoder do not pick up noise.</li> <li><strong>Single control UX</strong> — without a screen, menu depth and feedback (audio cues, LED if added later) matter more than on a phone app.</li> <li><strong>Thermal &amp; battery</strong> — continuous playback in a closed tin warms up; venting or power budgeting may be needed for long sessions.</li> </ul> </section> <section class="prose prose-lg max-w-none"> <h2>Status &amp; next steps</h2> <p>
The player is functional: browse a library, pick a track, listen on headphones, all from a mint tin on the desk. Planned improvements include a cleaner internal mount, better strain relief on the headphone jack, and optional Wi-Fi sync for dropping new albums onto the SD card without opening the case.
</p> <p>
Add build photos to <code>public/portfolio/personal-projects/altoids-ipod/</code> and swap the hero image when ready — the page is set up to showcase the real hardware.
</p> </section> </article> ` })}`;
}, "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal/altoids-ipod.astro", void 0);

const $$file = "C:/Users/Bee/GreenVinculumSite/greenvinculum.github.io/src/pages/portfolio/personal/altoids-ipod.astro";
const $$url = "/portfolio/personal/altoids-ipod";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AltoidsIpod,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

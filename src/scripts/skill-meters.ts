type SkillBar = {
  el: HTMLElement;
  meter: HTMLElement;
  screen: HTMLElement | null;
  signal: HTMLElement | null;
  label: HTMLElement | null;
  target: number;
  current: number;
  state: "idle" | "filling" | "full" | "glitching" | "restarting";
  fullSince: number | null;
  minFullMs: number;
  fillSpeed: number;
  raf: number | null;
  abortFill: boolean;
  staticSweepStop: (() => void) | null;
};

/** Slower analog fill — ~17s per 10% at multiplier 1.0 */
const FILL_MS_PER_PCT = 175;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const randomSigned = (min: number, max: number) => (Math.random() > 0.5 ? 1 : -1) * rand(min, max);
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function initSkillMeters(root: ParentNode = document): void {
  const fills = Array.from(root.querySelectorAll<HTMLElement>(".skill-meter-fill"));
  if (!fills.length) return;

  const host = fills[0].closest<HTMLElement>(".cv-section");
  if (host?.dataset.skillsInit === "1") return;
  if (host) {
    host.dataset.skillsInit = "1";
    host.classList.add("cv-skills-glitch");
    const speed =
      document.querySelector<HTMLElement>(".glitch-name-wrap")?.style.getPropertyValue("--glitch-speed") ||
      "5s";
    host.style.setProperty("--skill-glitch-speed", speed.trim() || "5s");
  }

  const bars: SkillBar[] = fills.map((el) => {
    const meter = el.closest<HTMLElement>(".skill-meter");
    if (!meter) throw new Error("skill-meter-fill missing .skill-meter parent");
    const raw =
      el.dataset.target ??
      el.style.getPropertyValue("--skill-level").replace("%", "").trim();
    const target = Math.max(0, Math.min(100, Number(raw) || 0));
    return {
      el,
      meter,
      screen: null,
      signal: meter.querySelector<HTMLElement>(".skill-meter-signal"),
      label: meter.querySelector<HTMLElement>(".skill-meter-pct"),
      target,
      current: 0,
      state: "idle",
      fullSince: null,
      minFullMs: rand(7_000, 15_000),
      fillSpeed: rand(0.38, 1.15),
      raf: null,
      abortFill: false,
      staticSweepStop: null,
    };
  });

  const maxFaultBars = Math.max(1, Math.ceil(bars.length / 3));
  const countFaulting = () =>
    bars.filter((b) => b.state === "glitching" || b.state === "restarting").length;

  const ensureChromaLayers = (bar: SkillBar) => {
    const signal = bar.signal;
    if (!signal || signal.querySelector(".skill-meter-chroma")) return;
    for (const ch of ["a", "b", "mint"] as const) {
      const span = document.createElement("span");
      span.className = `skill-meter-chroma skill-meter-chroma--${ch}`;
      span.setAttribute("aria-hidden", "true");
      signal.insertBefore(span, bar.el);
    }
  };

  const ensureCrtScreen = (bar: SkillBar) => {
    const track = bar.meter.querySelector<HTMLElement>(".skill-meter-track");
    if (!track) return;

    let crt = track.querySelector<HTMLElement>(".skill-meter-crt");
    if (!crt) {
      crt = document.createElement("div");
      crt.className = "skill-meter-crt";
      crt.setAttribute("aria-hidden", "true");
      track.insertBefore(crt, track.firstChild);
    }

    for (const layer of ["scanlines", "mask", "vignette", "beam", "grain", "noise"] as const) {
      if (crt.querySelector(`.skill-meter-crt-${layer}`)) continue;
      const span = document.createElement("span");
      span.className = `skill-meter-crt-${layer}`;
      crt.appendChild(span);
    }

    if (track.firstChild !== crt) {
      track.insertBefore(crt, track.firstChild);
    }
  };

  const ensureViewport = (bar: SkillBar) => {
    const body = bar.screen;
    if (!body) return;

    let viewport = body.querySelector<HTMLElement>(".skill-meter-viewport");
    if (!viewport) {
      viewport = document.createElement("div");
      viewport.className = "skill-meter-viewport";
      body.appendChild(viewport);
    }

    let glitchContent = body.querySelector<HTMLElement>(".skill-meter-glitch-content");
    if (!glitchContent) {
      glitchContent = document.createElement("div");
      glitchContent.className = "skill-meter-glitch-content";

      const fx = body.querySelector<HTMLElement>(".skill-meter-fx");
      if (fx && fx.parentElement !== body) {
        body.insertBefore(fx, body.firstChild);
      }

      const legacyInner = body.querySelector<HTMLElement>(".skill-meter-viewport-inner");
      const movable = legacyInner
        ? [...legacyInner.children]
        : [...body.children].filter(
            (node) =>
              node instanceof HTMLElement &&
              node !== viewport &&
              !node.classList.contains("skill-meter-fx") &&
              !node.classList.contains("skill-meter-static-runs") &&
              !node.classList.contains("skill-meter-viewport") &&
              !node.classList.contains("skill-meter-glitch-content")
          );

      movable.forEach((node) => {
        if (node instanceof HTMLElement && !node.classList.contains("skill-meter-fx")) {
          glitchContent.appendChild(node);
        }
      });

      legacyInner?.remove();
      viewport.insertBefore(glitchContent, viewport.firstChild);
    }

    ensureStaticRuns(bar);
    ensureTvPicture(bar);
  };

  const ensureTvPicture = (bar: SkillBar) => {
    const content = bar.screen?.querySelector<HTMLElement>(".skill-meter-glitch-content");
    if (!content || content.querySelector(".skill-meter-tv-picture")) return;

    const head = content.querySelector<HTMLElement>(".skill-meter-head");
    const track = content.querySelector<HTMLElement>(".skill-meter-track");
    if (!head || !track) return;

    const picture = document.createElement("div");
    picture.className = "skill-meter-tv-picture";
    picture.append(head, track);
    content.insertBefore(picture, content.firstChild);
  };

  const ensureStaticRuns = (bar: SkillBar) => {
    const viewport = bar.screen?.querySelector<HTMLElement>(".skill-meter-viewport");
    if (!viewport || viewport.querySelector(".skill-meter-static-runs")) return;

    const runs = document.createElement("div");
    runs.className = "skill-meter-static-runs";
    runs.setAttribute("aria-hidden", "true");

    for (const kind of ["run-a", "run-b", "run-dark-a", "run-dark-b"] as const) {
      const run = document.createElement("span");
      run.className = `skill-meter-static-run skill-meter-static-${kind}`;
      if (kind.includes("dark")) run.classList.add("is-dark");
      runs.appendChild(run);
    }
    viewport.appendChild(runs);
  };

  const ensureGlitchShell = (bar: SkillBar) => {
    const meter = bar.meter;
    let body = meter.querySelector<HTMLElement>(".skill-meter-body");
    if (!body) {
      body = document.createElement("div");
      body.className = "skill-meter-body";
      while (meter.firstChild) body.appendChild(meter.firstChild);
      meter.appendChild(body);
    }
    bar.screen = body;

    const legacyFx = meter.querySelector(":scope > .skill-meter-fx");
    if (legacyFx) body.insertBefore(legacyFx, body.firstChild);

    if (!body.querySelector(".skill-meter-fx")) {
      const fx = document.createElement("div");
      fx.className = "skill-meter-fx";
      fx.setAttribute("aria-hidden", "true");
      for (const layer of [
        "grain",
        "static",
        "vhs",
        "pixel",
        "dirt",
        "rgb-a",
        "rgb-b",
        "smear",
        "run-a",
        "run-b",
      ] as const) {
        const span = document.createElement("span");
        span.className = `skill-meter-fx-${layer}`;
        fx.appendChild(span);
      }
      body.insertBefore(fx, body.firstChild);
    }

    const fxInContent = body.querySelector(".skill-meter-glitch-content .skill-meter-fx");
    const fxOnBody = body.querySelector(":scope > .skill-meter-fx");
    if (fxInContent && !fxOnBody) {
      body.insertBefore(fxInContent, body.firstChild);
    }

    ensureViewport(bar);
  };

  const screenEl = (bar: SkillBar) => {
    if (!bar.screen) ensureGlitchShell(bar);
    return bar.screen!;
  };

  const setMagneticVars = (bar: SkillBar) => {
    const shell = screenEl(bar);
    shell.style.setProperty("--pull-a", `${randomSigned(10, 20).toFixed(1)}px`);
    shell.style.setProperty("--pull-b", `${randomSigned(10, 20).toFixed(1)}px`);
    shell.style.setProperty("--pull-c", `${randomSigned(12, 22).toFixed(1)}px`);
    shell.style.setProperty("--pull-d", `${randomSigned(12, 22).toFixed(1)}px`);
    shell.style.setProperty("--char-out-x", `${randomSigned(8, 18).toFixed(1)}px`);
    shell.style.setProperty("--char-jumble-x", `${randomSigned(0.4, 0.95).toFixed(2)}ch`);
    shell.style.setProperty("--char-stretch", `${rand(1.02, 1.12).toFixed(2)}`);
    shell.style.setProperty("--shell-static-shift", `${randomSigned(10, 18).toFixed(1)}px`);
    shell.style.setProperty("--shell-static-top", `${rand(18, 58).toFixed(1)}%`);
    shell.style.setProperty("--shell-static-bottom", `${rand(32, 72).toFixed(1)}%`);

    bar.signal?.style.setProperty("--rgb-angle-a", `${rand(-6, -0.8).toFixed(2)}deg`);
    bar.signal?.style.setProperty("--rgb-angle-b", `${rand(0.8, 6).toFixed(2)}deg`);
    bar.signal?.style.setProperty("--rgb-jitter", `${rand(-6, 6).toFixed(1)}px`);
    bar.signal?.style.setProperty("--rgb-shift-x", `${rand(-11, 11).toFixed(1)}px`);
    bar.signal?.style.setProperty("--rgb-shift-y", `${rand(-4, 4).toFixed(1)}px`);
    bar.signal?.style.setProperty("--signal-skew", `${rand(-4, 4).toFixed(2)}deg`);
  };

  const resetDistortionVars = (bar: SkillBar) => {
    setMagneticVars(bar);
  };

  const glitchContent = (bar: SkillBar) =>
    bar.screen?.querySelector<HTMLElement>(".skill-meter-glitch-content") ?? null;

  const tvPicture = (bar: SkillBar) =>
    glitchContent(bar)?.querySelector<HTMLElement>(".skill-meter-tv-picture") ?? null;

  const syncStaticRunMirror = (bar: SkillBar, runEl: HTMLElement) => {
    const picture = tvPicture(bar);
    if (!picture) return;

    runEl.replaceChildren();
    const mirror = picture.cloneNode(true) as HTMLElement;
    mirror.classList.add("skill-meter-tv-picture--mirror");
    mirror.setAttribute("aria-hidden", "true");
    runEl.appendChild(mirror);
  };

  const pullLivePicture = (
    bar: SkillBar,
    opts: {
      top: number;
      thickness: number;
      shift: number;
      skew: number;
      scale: number;
      durationMs: number;
    }
  ) => {
    const picture = tvPicture(bar);
    if (!picture) return;

    const bottom = Math.max(0, 100 - opts.top - opts.thickness);
    picture.style.setProperty("--band-top", `${opts.top}%`);
    picture.style.setProperty("--band-bottom", `${bottom}%`);
    picture.style.setProperty("--band-shift", `${opts.shift.toFixed(1)}px`);
    picture.style.setProperty("--band-skew", `${opts.skew.toFixed(2)}deg`);
    picture.style.setProperty("--band-scale", opts.scale.toFixed(3));
    picture.classList.add("is-band-pulled");

    window.setTimeout(() => {
      picture.classList.remove("is-band-pulled");
      picture.style.removeProperty("--band-top");
      picture.style.removeProperty("--band-bottom");
      picture.style.removeProperty("--band-shift");
      picture.style.removeProperty("--band-skew");
      picture.style.removeProperty("--band-scale");
    }, opts.durationMs);
  };

  const triggerStaticRun = (bar: SkillBar, runEl: HTMLElement) => {
    const top = randInt(4, 78);
    const isDark = runEl.classList.contains("is-dark");
    let thickness = isDark ? randInt(8, 18) : randInt(4, 12);
    let durationMin = isDark ? 180 : 140;
    let durationMax = isDark ? 420 : 340;
    let modeClass = "is-mode-normal";
    let shift = randomSigned(6, 22);
    let skew = randomSigned(2.5, 9);
    let scale = rand(1.03, isDark ? 1.14 : 1.1);

    if (isDark) {
      const modeRoll = Math.random();
      if (modeRoll < 0.33) {
        thickness = randInt(14, 24);
        durationMin = 220;
        durationMax = 480;
        modeClass = "is-mode-heavy";
        shift = randomSigned(10, 28);
        skew = randomSigned(4, 12);
        scale = rand(1.06, 1.16);
      } else if (modeRoll < 0.66) {
        thickness = randInt(10, 18);
        durationMin = 90;
        durationMax = 210;
        modeClass = "is-mode-hardcut";
        shift = randomSigned(12, 32);
        skew = randomSigned(3, 10);
        scale = rand(1.04, 1.12);
      }
    }

    syncStaticRunMirror(bar, runEl);
    runEl.style.setProperty("--static-top", `${top}%`);
    runEl.style.setProperty("--static-bottom", `${Math.max(0, 100 - top - thickness)}%`);
    runEl.style.setProperty("--static-shift", `${shift.toFixed(1)}px`);
    runEl.style.setProperty("--static-skew", `${skew.toFixed(2)}deg`);
    runEl.style.setProperty("--static-scale", scale.toFixed(3));

    const durationMs = randInt(durationMin, durationMax);
    pullLivePicture(bar, { top, thickness, shift, skew, scale, durationMs });

    runEl.classList.remove("is-mode-normal", "is-mode-heavy", "is-mode-hardcut");
    runEl.classList.add(modeClass, "is-active");
    window.setTimeout(() => {
      runEl.classList.remove("is-active", "is-mode-normal", "is-mode-heavy", "is-mode-hardcut");
      runEl.replaceChildren();
    }, durationMs);
  };

  const startStaticSweeps = (bar: SkillBar) => {
    stopStaticSweeps(bar);
    const viewport = bar.screen?.querySelector<HTMLElement>(".skill-meter-viewport");
    const runs = viewport
      ? Array.from(viewport.querySelectorAll<HTMLElement>(".skill-meter-static-run"))
      : [];
    if (!runs.length) return;

    let cancelled = false;
    const sweep = () => {
      if (cancelled || bar.state !== "glitching") return;
      triggerStaticRun(bar, runs[randInt(0, runs.length - 1)]);
      if (Math.random() < 0.88) {
        window.setTimeout(() => {
          if (!cancelled && bar.state === "glitching") {
            triggerStaticRun(bar, runs[randInt(0, runs.length - 1)]);
          }
        }, randInt(45, 140));
      }
      if (Math.random() < 0.72) {
        window.setTimeout(() => {
          if (!cancelled && bar.state === "glitching") {
            triggerStaticRun(bar, runs[randInt(0, runs.length - 1)]);
          }
        }, randInt(120, 280));
      }
      if (Math.random() < 0.48) {
        const darkRuns = runs.filter((run) => run.classList.contains("is-dark"));
        if (darkRuns.length) {
          window.setTimeout(() => {
            if (!cancelled && bar.state === "glitching") {
              triggerStaticRun(bar, darkRuns[randInt(0, darkRuns.length - 1)]);
            }
          }, randInt(60, 200));
        }
      }
      window.setTimeout(sweep, rand(70, 320));
    };
    sweep();
    bar.staticSweepStop = () => {
      cancelled = true;
      runs.forEach((run) => {
        run.classList.remove("is-active", "is-mode-normal", "is-mode-heavy", "is-mode-hardcut");
        run.replaceChildren();
      });
    };
  };

  const stopStaticSweeps = (bar: SkillBar) => {
    bar.staticSweepStop?.();
    bar.staticSweepStop = null;
  };

  const setPct = (bar: SkillBar, pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    bar.current = clamped;
    bar.el.style.width = `${clamped}%`;
    bar.signal?.style.setProperty("--fill-w", `${clamped}%`);
    if (bar.label) bar.label.textContent = `${Math.round(clamped)}%`;
  };

  const cancelAnim = (bar: SkillBar) => {
    if (bar.raf != null) cancelAnimationFrame(bar.raf);
    bar.raf = null;
  };

  const animateWidth = (
    bar: SkillBar,
    from: number,
    to: number,
    durationMs: number,
    stepPx = 2
  ) =>
    new Promise<void>((resolve) => {
      cancelAnim(bar);
      const delta = to - from;
      if (Math.abs(delta) < 0.5 || bar.abortFill) {
        if (!bar.abortFill) setPct(bar, to);
        resolve();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        if (bar.abortFill) {
          bar.raf = null;
          resolve();
          return;
        }
        const t = Math.min(1, (now - start) / durationMs);
        const raw = from + delta * t;
        const stepped = Math.round(raw / stepPx) * stepPx;
        setPct(bar, stepped);
        if (t < 1) {
          bar.raf = requestAnimationFrame(tick);
        } else {
          setPct(bar, to);
          bar.raf = null;
          resolve();
        }
      };
      bar.raf = requestAnimationFrame(tick);
    });

  const markFull = (bar: SkillBar) => {
    bar.state = "full";
    bar.el.classList.remove("is-filling", "is-paused");
    bar.screen?.classList.remove("is-power-restart");
    bar.fullSince = Date.now();
    bar.minFullMs = rand(6_500, 14_500);
    bar.fillSpeed = rand(0.38, 1.15);
  };

  const pickEligibleFullBars = (max: number) => {
    const now = Date.now();
    const pool = bars.filter(
      (b) => b.state === "full" && b.fullSince != null && now - b.fullSince >= b.minFullMs
    );
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, max);
  };

  const setSignalGlitch = (bar: SkillBar, on: boolean) => {
    const shell = screenEl(bar);
    if (on) {
      resetDistortionVars(bar);
      shell.classList.add("is-signal-glitch");
    } else {
      shell.classList.remove(
        "is-signal-glitch",
        "is-partial-signal",
        "is-signal-darkout",
        "is-signal-lost",
        "is-signal-dead"
      );
    }
  };

  const nudgeSignalOffset = (bar: SkillBar) => {
    setMagneticVars(bar);
  };

  const buildFillPlan = (bar: SkillBar, from: number, to: number) => {
    const delta = to - from;
    if (delta <= 0) return [{ pct: to, speedMul: 1, pauseMs: 0 }];

    const pauseCount = randInt(0, delta > 25 ? 3 : 2);
    const mids: number[] = [];
    for (let i = 0; i < pauseCount; i++) {
      mids.push(from + delta * rand(0.15, 0.92));
    }
    mids.sort((a, b) => a - b);

    const points = [from, ...mids, to];
    const unique: number[] = [];
    for (const p of points) {
      const v = Math.round(p * 10) / 10;
      if (!unique.length || Math.abs(v - unique[unique.length - 1]) > 2) unique.push(v);
    }
    if (unique[unique.length - 1] !== to) unique.push(to);

    return unique.slice(1).map((pct, i) => ({
      pct,
      speedMul: rand(0.4, 2.1),
      pauseMs: Math.random() < 0.68 ? rand(500, 3_200) : 0,
      stutter: Math.random() < 0.32,
    }));
  };

  const runRestartFlicker = async (bar: SkillBar) => {
    const flickers = randInt(1, 2);
    const shell = screenEl(bar);
    shell.classList.add("is-power-restart", "is-restart-flicker");

    for (let i = 0; i < flickers; i++) {
      if (bar.abortFill || bar.state === "glitching") return;

      shell.classList.add("is-restart-flash");
      setPct(bar, bar.target * rand(0.1, 0.24));
      if (bar.label) bar.label.classList.remove("is-pct-dead");
      await sleep(rand(85, 165));

      if (bar.abortFill || bar.state === "glitching") return;

      shell.classList.remove("is-restart-flash");
      setPct(bar, 0);
      if (bar.label) bar.label.classList.add("is-pct-dead");
      await sleep(rand(130, 260));
    }

    shell.classList.remove("is-restart-flicker", "is-restart-flash");
    setPct(bar, 0);
    if (bar.label) bar.label.classList.remove("is-pct-dead");
  };

  const fillWithPersonality = async (bar: SkillBar, from?: number, afterFault = false) => {
    const start = from ?? bar.current;
    const end = bar.target;
    if (start >= end - 0.5) {
      setPct(bar, end);
      markFull(bar);
      return;
    }

    bar.abortFill = false;
    bar.state = afterFault ? "restarting" : "filling";
    bar.fullSince = null;
    const shell = screenEl(bar);
    shell.classList.remove("is-glitching", "is-interference-phase");
    stopStaticSweeps(bar);
    setSignalGlitch(bar, false);
    bar.el.classList.remove("is-draining", "is-paused");

    if (afterFault) {
      await runRestartFlicker(bar);
      if (bar.abortFill || bar.state === "glitching") return;
    }

    bar.el.classList.add("is-filling");
    if (afterFault) shell.classList.add("is-power-restart");

    let cursor = start;
    const segments = buildFillPlan(bar, start, end);

    for (const seg of segments) {
      if (bar.abortFill || bar.state === "glitching") return;

      const duration =
        Math.abs(seg.pct - cursor) * FILL_MS_PER_PCT * bar.fillSpeed * seg.speedMul;
      await animateWidth(bar, cursor, seg.pct, Math.max(120, duration), randInt(1, 3));
      cursor = seg.pct;

      if (seg.stutter && !bar.abortFill) {
        bar.el.classList.add("is-paused");
        await sleep(rand(120, 420));
        bar.el.classList.remove("is-paused");
      }

      if (seg.pauseMs > 0 && !bar.abortFill) {
        bar.el.classList.remove("is-filling");
        bar.el.classList.add("is-paused");
        await sleep(seg.pauseMs);
        if (!bar.abortFill) {
          bar.el.classList.remove("is-paused");
          bar.el.classList.add("is-filling");
        }
      }
    }

    if (!bar.abortFill && bar.state !== "glitching") {
      setPct(bar, end);
      markFull(bar);
    }
  };

  /** Slow VHS-style interference, then instant power cut — no drain roll-off. */
  const runSignalInterference = async (bar: SkillBar) => {
    const shell = screenEl(bar);
    shell.classList.add("is-glitching", "is-interference-phase");
    setSignalGlitch(bar, true);
    shell.classList.add("is-partial-signal");
    startStaticSweeps(bar);

    await sleep(rand(1_400, 2_600));
    nudgeSignalOffset(bar);

    await sleep(rand(900, 1_600));
    nudgeSignalOffset(bar);

    await sleep(rand(1_200, 2_200));

    shell.classList.add("is-signal-darkout");
    if (bar.label) bar.label.classList.add("is-pct-dim");
    await sleep(rand(280, 520));

    shell.classList.remove("is-partial-signal", "is-interference-phase");
    shell.classList.add("is-signal-lost");
    setSignalGlitch(bar, false);
    stopStaticSweeps(bar);
    setPct(bar, 0);
    if (bar.label) {
      bar.label.classList.remove("is-pct-dim");
      bar.label.classList.add("is-pct-dead");
    }
    await sleep(rand(750, 1_450));

    shell.classList.remove("is-signal-darkout", "is-signal-lost", "is-signal-dead", "is-glitching");
    if (bar.label) bar.label.classList.remove("is-pct-dead");
  };

  const runGlitch = async (bar: SkillBar) => {
    if (bar.state !== "full") return;
    bar.state = "glitching";
    bar.abortFill = true;
    cancelAnim(bar);
    bar.fullSince = null;

    await runSignalInterference(bar);

    bar.abortFill = false;
    await fillWithPersonality(bar, 0, true);
  };

  const scheduleGlitchCheck = () => {
    const nextIn = rand(2_000, 4_200);
    window.setTimeout(() => {
      const slots = maxFaultBars - countFaulting();
      if (slots > 0 && Math.random() < rand(0.42, 0.68)) {
        const pickCount = Math.min(slots, randInt(1, Math.min(2, slots)));
        pickEligibleFullBars(pickCount).forEach((bar, i) => {
          window.setTimeout(() => void runGlitch(bar), i * rand(280, 820));
        });
      }
      scheduleGlitchCheck();
    }, nextIn);
  };

  const boot = () => {
    bars.forEach((b) => {
      ensureChromaLayers(b);
      ensureGlitchShell(b);
      ensureCrtScreen(b);
      ensureTvPicture(b);
      b.abortFill = false;
      setPct(b, 0);
      b.state = "idle";
    });

    bars.forEach((bar) => {
      const delay = rand(0, 1_400);
      window.setTimeout(() => fillWithPersonality(bar, 0), delay);
    });

    window.setTimeout(() => scheduleGlitchCheck(), rand(2_000, 5_500));
  };

  const section = bars[0].meter.closest(".cv-section");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    bars.forEach((b) => {
      setPct(b, b.target);
      b.state = "full";
    });
    return;
  }

  if (!section) {
    boot();
    return;
  }

  const started = { done: false };
  const obs = new IntersectionObserver(
    (entries) => {
      if (started.done) return;
      if (entries.some((e) => e.isIntersecting)) {
        started.done = true;
        obs.disconnect();
        boot();
      }
    },
    { threshold: 0.25, rootMargin: "0px 0px -6% 0px" }
  );
  obs.observe(section);
}

export type NerveTimelineIds = {
  viz: string;
  svg: string;
  mesh: string;
  events: string;
  glitch: string;
  clouds: string;
};

export type NerveTimelineConfig = {
  ids: NerveTimelineIds;
  /** When set, copies --glitch-speed from this element (e.g. homepage name glitch). */
  syncGlitchFromSelector?: string;
  rngSeedOffset?: number;
};

export function initNerveTimeline(config: NerveTimelineConfig): void {
  const { ids, syncGlitchFromSelector, rngSeedOffset = 0 } = config;
  const viz = document.getElementById(ids.viz);
  const svg = document.getElementById(ids.svg);
  const meshGroup = document.getElementById(ids.mesh);
  const eventsGroup = document.getElementById(ids.events);
  const glitchGroup = document.getElementById(ids.glitch);
  const clouds = document.getElementById(ids.clouds);
  const svgNs = "http://www.w3.org/2000/svg";
  let impulseEls: SVGPathElement[] = [];
  let edgeAdjacency: number[][] = [];
  let lastMesh: ReturnType<typeof buildMeshLattice> | null = null;
  let eventByPoint = new Map<number, number>();
  if (!viz || !svg || !meshGroup || !eventsGroup || !glitchGroup || !clouds) return;

  const glitchWrap = syncGlitchFromSelector
    ? document.querySelector<HTMLElement>(syncGlitchFromSelector)
    : null;
  const syncGlitchSpeed = () => {
    const speed = glitchWrap?.style.getPropertyValue("--glitch-speed") || "5s";
    viz.style.setProperty("--glitch-speed", speed);
  };
  syncGlitchSpeed();
  if (glitchWrap) {
    new MutationObserver(syncGlitchSpeed).observe(glitchWrap, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  const items = Array.from(viz.querySelectorAll<HTMLElement>(".news-item"));

  const createRng = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  const HEX_ANGLE = Math.PI / 3;
  const fmt = (n: number) => n.toFixed(1);

  const buildHatMeshPath = (
    anchors: { y: number; item: HTMLElement; node: Element | null }[],
    totalH: number,
    rnd: () => number
  ) => {
    const xLo = 8;
    const xHi = 46;
    const sorted = [...anchors].sort((a, b) => a.y - b.y);
    const clampX = (v: number) => Math.max(xLo, Math.min(xHi, v));

    const verts: { x: number; y: number; anchorRef?: (typeof anchors)[0] }[] = [];
    let x = 12 + rnd() * 22;
    let y = 3 + rnd() * 2;
    let heading = -Math.PI / 2 + (rnd() - 0.5) * 0.55;
    verts.push({ x, y });

    const hatLeg = () => {
      const leg = 5 + rnd() * 5.5;
      const kink = (rnd() < 0.5 ? -1 : 1) * HEX_ANGLE * (0.35 + rnd() * 0.45);
      const fray = rnd() < 0.12 ? (rnd() - 0.5) * 0.45 : 0;
      heading += kink + fray;
      heading = heading * 0.82 + (-Math.PI / 2) * 0.18;
      const dx = Math.cos(heading) * leg;
      const dy = Math.abs(Math.sin(heading)) * leg + 1.8 + rnd() * 2.2;
      x = clampX(x + dx);
      y += dy;
      verts.push({ x, y });
    };

    let ai = 0;
    while (y < totalH - 5) {
      const target = sorted[ai];
      if (target && y + 10 >= target.y - 2) {
        while (y < target.y - 2) hatLeg();
        x = clampX(x + (rnd() - 0.5) * 8);
        y = target.y;
        verts.push({ x, y, anchorRef: target });
        ai++;
        continue;
      }
      hatLeg();
    }
    hatLeg();
    verts.push({ x: clampX(x + (rnd() - 0.5) * 6), y: totalH - 3 });

    const tagged = sorted.map((anchor) => {
      const hit = verts.find((v) => v.anchorRef === anchor);
      return { ...anchor, x: hit ? hit.x : clampX(12 + rnd() * 20) };
    });

    return { tagged, verts, clampX };
  };

  const buildMeshLattice = (
    verts: { x: number; y: number; anchorRef?: unknown }[],
    clampX: (v: number) => number,
    rnd: () => number
  ) => {
    const points: {
      x: number;
      y: number;
      spine: boolean;
      event: boolean;
      anchorRef: unknown;
      spineAt?: number;
    }[] = [];
    const spineIdx: number[] = [];

    verts.forEach((v, i) => {
      const id = points.length;
      spineIdx.push(id);
      points.push({
        x: v.x,
        y: v.y,
        spine: true,
        event: !!v.anchorRef,
        anchorRef: v.anchorRef || null,
      });

      if (i === 0 || i === verts.length - 1) return;
      const wingR = 6 + rnd() * 8;
      for (const side of [-1, 1]) {
        if (side > 0 && rnd() > 0.92) continue;
        const ang = -Math.PI / 2 + side * HEX_ANGLE * (0.45 + rnd() * 0.55);
        points.push({
          x: clampX(v.x + Math.cos(ang) * wingR),
          y: v.y + Math.sin(ang) * wingR * 0.38,
          spine: false,
          event: false,
          spineAt: i,
        });
      }
    });

    const dist2Max = 24 * 24;
    const edges: {
      a: number;
      b: number;
      tone: string;
      weight: string;
      chord: boolean;
    }[] = [];
    const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    const seen = new Set<string>();

    const classifyEdgeWeight = (a: number, b: number) => {
      const pa = points[a];
      const pb = points[b];
      if (pa.spine && pb.spine) {
        if (pa.event || pb.event) return "mid";
        return rnd() < 0.4 ? "mid" : "thin";
      }
      if (pa.spine !== pb.spine) return "hair";
      return "hair";
    };

    const classifyEdgeTone = (a: number, b: number) => {
      const pa = points[a];
      const pb = points[b];
      if (pa.spine && pb.spine) return "dark";
      if (pa.spine !== pb.spine) return rnd() < 0.62 ? "dark" : "light";
      return rnd() < 0.48 ? "light" : "dark";
    };

    const classifyFaceWeight = () => {
      const r = rnd();
      if (r < 0.32) return "fade";
      if (r < 0.68) return "soft";
      return "norm";
    };

    const link = (a: number, b: number, force = false) => {
      if (a === b) return;
      const k = edgeKey(a, b);
      if (seen.has(k)) return;
      if (!force) {
        const dx = points[a].x - points[b].x;
        const dy = points[a].y - points[b].y;
        if (dx * dx + dy * dy > dist2Max) return;
        if (rnd() > 0.84) return;
      }
      seen.add(k);
      const pa = points[a];
      const pb = points[b];
      edges.push({
        a,
        b,
        tone: classifyEdgeTone(a, b),
        weight: classifyEdgeWeight(a, b),
        chord: !!(pa.spine && pb.spine),
      });
    };

    for (let i = 0; i < spineIdx.length - 1; i++) {
      link(spineIdx[i], spineIdx[i + 1], true);
    }

    for (let i = 0; i < points.length; i++) {
      if (!points[i].spine && points[i].spineAt != null) {
        link(i, spineIdx[points[i].spineAt!], true);
      }
    }

    for (let i = 0; i < spineIdx.length - 1; i++) {
      const wingsA: number[] = [];
      const wingsB: number[] = [];
      points.forEach((p, idx) => {
        if (p.spine) return;
        if (p.spineAt === i) wingsA.push(idx);
        if (p.spineAt === i + 1) wingsB.push(idx);
      });
      const s0 = spineIdx[i];
      const s1 = spineIdx[i + 1];
      wingsA.forEach((wa) => {
        link(s0, wa, true);
        wingsB.forEach((wb) => link(wa, wb, true));
      });
      wingsB.forEach((wb) => link(s1, wb, true));
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        link(i, j);
      }
    }

    const triangles: { a: number; b: number; c: number; tone: string; face: string }[] = [];
    const triKey = (a: number, b: number, c: number) => [a, b, c].sort((x, y) => x - y).join(":");
    const triSeen = new Set<string>();
    const addTri = (a: number, b: number, c: number) => {
      const k = triKey(a, b, c);
      if (triSeen.has(k)) return;
      triSeen.add(k);
      triangles.push({
        a,
        b,
        c,
        tone: (a + b + c) % 2 === 0 ? "light" : "dark",
        face: classifyFaceWeight(),
      });
    };

    for (let i = 0; i < spineIdx.length - 1; i++) {
      const s0 = spineIdx[i];
      const s1 = spineIdx[i + 1];
      const wingsA = points
        .map((p, idx) => (!p.spine && p.spineAt === i ? idx : -1))
        .filter((x) => x >= 0);
      const wingsB = points
        .map((p, idx) => (!p.spine && p.spineAt === i + 1 ? idx : -1))
        .filter((x) => x >= 0);
      wingsA.forEach((wa) => {
        addTri(s0, s1, wa);
        wingsB.forEach((wb) => addTri(s0, wa, wb));
      });
      wingsB.forEach((wb) => addTri(s0, s1, wb));
      if (wingsA.length >= 2) addTri(s0, wingsA[0], wingsA[1]);
    }

    return { points, edges, triangles };
  };

  const renderMesh = (mesh: NonNullable<typeof lastMesh>) => {
    meshGroup.replaceChildren();
    const frag = document.createDocumentFragment();

    mesh.triangles.forEach((tri) => {
      if (tri.face === "norm") return;
      const pa = mesh.points[tri.a];
      const pb = mesh.points[tri.b];
      const pc = mesh.points[tri.c];
      if (!pa.spine && !pb.spine && !pc.spine) return;
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute(
        "d",
        `M ${fmt(pa.x)} ${fmt(pa.y)} L ${fmt(pb.x)} ${fmt(pb.y)} L ${fmt(pc.x)} ${fmt(pc.y)} Z`
      );
      path.setAttribute(
        "class",
        `news-mesh-face news-mesh-face--${tri.tone} news-mesh-face--w-${tri.face}`
      );
      frag.appendChild(path);
    });

    mesh.edges.forEach((edge, edgeIndex) => {
      const pa = mesh.points[edge.a];
      const pb = mesh.points[edge.b];
      const line = document.createElementNS(svgNs, "line");
      line.setAttribute("x1", fmt(pa.x));
      line.setAttribute("y1", fmt(pa.y));
      line.setAttribute("x2", fmt(pb.x));
      line.setAttribute("y2", fmt(pb.y));
      line.setAttribute("data-edge-i", String(edgeIndex));
      const chordCls = edge.chord ? " news-mesh-line--chord" : "";
      line.setAttribute(
        "class",
        `news-mesh-line news-mesh-line--${edge.tone} news-mesh-line--w-${edge.weight}${chordCls}`
      );
      frag.appendChild(line);
    });

    mesh.points.forEach((p) => {
      if (p.event) return;
      const dot = document.createElementNS(svgNs, "circle");
      dot.setAttribute("cx", fmt(p.x));
      dot.setAttribute("cy", fmt(p.y));
      dot.setAttribute("r", p.spine ? "0.42" : "0.28");
      dot.setAttribute(
        "class",
        p.spine ? "news-mesh-synapse" : "news-mesh-synapse news-mesh-synapse--dim"
      );
      frag.appendChild(dot);
    });

    meshGroup.appendChild(frag);
  };

  const renderEventNodes = (
    tagged: { x: number; y: number; item: HTMLElement; node: Element | null }[]
  ) => {
    eventsGroup.replaceChildren();
    const frag = document.createDocumentFragment();
    tagged.forEach((p, i) => {
      const group = document.createElementNS(svgNs, "g");
      group.setAttribute("class", "news-neuron");
      group.setAttribute("data-event-i", String(i));
      const cycle = 4.8 + i * 0.85;
      group.style.setProperty("--event-cycle", `${cycle}s`);
      group.style.animationDelay = `-${(i * 1.6 + 0.3).toFixed(2)}s`;

      const nr = createRng(i * 31337 + 99);
      for (let d = 0; d < 5; d++) {
        const ang = -Math.PI / 2 + nr() * Math.PI * 2;
        const len = 4.5 + nr() * 8;
        const dend = document.createElementNS(svgNs, "line");
        dend.setAttribute("x1", fmt(p.x));
        dend.setAttribute("y1", fmt(p.y));
        dend.setAttribute("x2", fmt(p.x + Math.cos(ang) * len));
        dend.setAttribute("y2", fmt(p.y + Math.sin(ang) * len * 0.55));
        dend.setAttribute("class", "news-neuron-dendrite");
        group.appendChild(dend);
      }

      const soma = document.createElementNS(svgNs, "circle");
      soma.setAttribute("cx", fmt(p.x));
      soma.setAttribute("cy", fmt(p.y));
      soma.setAttribute("r", "5.2");
      soma.setAttribute("class", "news-neuron-soma");

      const nucleus = document.createElementNS(svgNs, "circle");
      nucleus.setAttribute("cx", fmt(p.x));
      nucleus.setAttribute("cy", fmt(p.y));
      nucleus.setAttribute("r", "2.1");
      nucleus.setAttribute("class", "news-neuron-nucleus");

      group.appendChild(soma);
      group.appendChild(nucleus);
      frag.appendChild(group);
    });
    eventsGroup.appendChild(frag);

    items.forEach((item, i) => {
      if (item.dataset.current !== "true") return;
      eventsGroup
        .querySelector(`.news-neuron[data-event-i="${i}"]`)
        ?.classList.add("news-neuron--current");
    });
  };

  const buildEdgeAdjacency = (mesh: NonNullable<typeof lastMesh>) => {
    const pointEdges = new Map<number, number[]>();
    mesh.edges.forEach((edge, i) => {
      for (const v of [edge.a, edge.b]) {
        if (!pointEdges.has(v)) pointEdges.set(v, []);
        pointEdges.get(v)!.push(i);
      }
    });
    return mesh.edges.map((_, i) => {
      const edge = mesh.edges[i];
      const neighbors = new Set<number>();
      for (const v of [edge.a, edge.b]) {
        for (const j of pointEdges.get(v) || []) {
          if (j !== i) neighbors.add(j);
        }
      }
      return [...neighbors];
    });
  };

  const IMPULSE_STROKE: Record<string, string> = {
    red: "rgba(255, 72, 72, 0.98)",
    blue: "rgba(88, 168, 255, 0.96)",
    mint: "rgba(210, 255, 238, 1)",
    dual: "rgba(255, 120, 120, 0.95)",
  };

  const prepImpulsePath = (path: SVGPathElement) => {
    const len = Math.max(6, path.getTotalLength?.() ?? 18);
    const dash = Math.max(4, len * 0.42);
    const gap = Math.max(3, len * 0.58);
    path.style.setProperty("--impulse-len", String(len));
    path.style.strokeDasharray = `${dash} ${gap}`;
    path.style.strokeDashoffset = String(dash);
  };

  const renderNeuronImpulses = (mesh: NonNullable<typeof lastMesh>) => {
    glitchGroup.replaceChildren();
    impulseEls = mesh.edges.map((edge, edgeIndex) => {
      const pa = mesh.points[edge.a];
      const pb = mesh.points[edge.b];
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", `M ${fmt(pa.x)} ${fmt(pa.y)} L ${fmt(pb.x)} ${fmt(pb.y)}`);
      path.setAttribute("class", "news-impulse");
      path.setAttribute("data-edge-i", String(edgeIndex));
      if (edge.chord) path.setAttribute("data-chord", "1");
      glitchGroup.appendChild(path);
      prepImpulsePath(path);
      return path;
    });
  };

  const flashNeuronIfEdge = (edgeIndex: number) => {
    if (!lastMesh) return;
    const edge = lastMesh.edges[edgeIndex];
    if (!edge) return;
    const eventI = eventByPoint.get(edge.a) ?? eventByPoint.get(edge.b);
    if (eventI == null) return;
    const node = eventsGroup.querySelector(`.news-neuron[data-event-i="${eventI}"]`);
    if (!node || node.classList.contains("is-hover")) return;
    node.classList.add("news-neuron--spark");
    window.setTimeout(() => node.classList.remove("news-neuron--spark"), 140);
  };

  const clearImpulse = (el: SVGPathElement) => {
    el.classList.remove(
      "news-impulse--firing",
      "news-impulse--red",
      "news-impulse--blue",
      "news-impulse--mint",
      "news-impulse--dual"
    );
    el.removeAttribute("stroke");
    prepImpulsePath(el);
  };

  const pulseImpulse = (el: SVGPathElement, channel: string) => {
    const color = IMPULSE_STROKE[channel] ?? IMPULSE_STROKE.mint;
    clearImpulse(el);
    el.setAttribute("stroke", color);
    void el.getBBox();
    el.classList.add("news-impulse--firing", `news-impulse--${channel}`);
    const onEnd = () => {
      el.removeEventListener("animationend", onEnd);
      clearImpulse(el);
    };
    el.addEventListener("animationend", onEnd, { once: true });
    window.setTimeout(onEnd, 520);
  };

  const fireNeuronBurst = () => {
    if (!impulseEls.length || !edgeAdjacency.length) return;
    const channels = ["red", "blue", "mint", "dual"];
    const hopCount = 3 + Math.floor(Math.random() * 9);
    let current = Math.floor(Math.random() * impulseEls.length);
    const visited = new Set<number>();
    let hop = 0;

    const pickNeighbor = (idx: number) => {
      const adj = edgeAdjacency[idx] || [];
      if (!adj.length) return null;
      const fresh = adj.filter((j) => !visited.has(j));
      const pool = fresh.length ? fresh : adj;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const stepHop = () => {
      if (hop >= hopCount) return;
      const ch = channels[Math.floor(Math.random() * channels.length)];
      pulseImpulse(impulseEls[current], ch);
      if (Math.random() < 0.55) flashNeuronIfEdge(current);
      visited.add(current);
      hop++;
      const next = pickNeighbor(current);
      if (next == null) return;
      current = next;
      window.setTimeout(stepHop, 52 + Math.random() * 95);
    };
    stepHop();

    if (Math.random() < 0.5) {
      let branch = Math.floor(Math.random() * impulseEls.length);
      const branchHops = 2 + Math.floor(Math.random() * 5);
      for (let b = 0; b < branchHops; b++) {
        const edgeIdx = branch;
        window.setTimeout(() => {
          pulseImpulse(
            impulseEls[edgeIdx],
            channels[Math.floor(Math.random() * channels.length)]
          );
        }, 20 + b * (40 + Math.random() * 55));
        const neighbors = edgeAdjacency[branch] || [];
        if (!neighbors.length) break;
        branch = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }
  };

  const scheduleNeuronFire = () => {
    const waitMs = 180 + Math.random() * 1400;
    window.setTimeout(() => {
      fireNeuronBurst();
      if (Math.random() < 0.48) {
        window.setTimeout(fireNeuronBurst, 80 + Math.random() * 280);
      }
      scheduleNeuronFire();
    }, waitMs);
  };

  const scheduleEventDotGlitch = () => {
    const nodes = [...eventsGroup.querySelectorAll(".news-neuron")];
    if (!nodes.length) return;
    const waitMs = 1800 + Math.random() * 4200;
    window.setTimeout(() => {
      const pick = nodes[Math.floor(Math.random() * nodes.length)];
      if (!pick.classList.contains("is-hover")) {
        const offMs = 48 + Math.random() * 110;
        pick.classList.add("is-off");
        window.setTimeout(() => {
          pick.classList.remove("is-off");
          scheduleEventDotGlitch();
        }, offMs);
      } else {
        scheduleEventDotGlitch();
      }
    }, waitMs);
  };

  const seedClouds = () => {
    if (clouds.dataset.seeded === "1") return;
    clouds.dataset.seeded = "1";
    const count = 28;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "news-cloud-dot";
      dot.style.left = `${8 + Math.random() * 38}%`;
      dot.style.top = `${Math.random() * 98}%`;
      dot.style.setProperty("--dot-r", `${0.08 + Math.random() * 0.22}rem`);
      dot.style.setProperty("--dot-a", `${0.12 + Math.random() * 0.38}`);
      dot.style.animationDelay = `${Math.random() * 2}s`;
      dot.style.animationDuration = `${3.5 + Math.random() * 4}s`;
      clouds.appendChild(dot);
    }
  };

  const layout = () => {
    const vizRect = viz.getBoundingClientRect();
    const w = Math.max(48, Math.round(vizRect.width));
    const h = Math.max(120, Math.round(vizRect.height));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));

    const anchors = items.map((item) => {
      const node = item.querySelector(".news-node");
      const anchor = node || item;
      const ar = anchor.getBoundingClientRect();
      return {
        y: ar.top - vizRect.top + ar.height * 0.5,
        item,
        node,
      };
    });

    if (anchors.length === 0) return;

    const rnd = createRng(anchors.length * 7919 + 104729 + rngSeedOffset);
    const spine = buildHatMeshPath(anchors, h, rnd);
    const mesh = buildMeshLattice(spine.verts, spine.clampX, rnd);

    lastMesh = mesh;
    eventByPoint = new Map();
    mesh.points.forEach((p, idx) => {
      if (!p.event || !p.anchorRef) return;
      const i = spine.tagged.findIndex((t) => t === p.anchorRef);
      if (i >= 0) eventByPoint.set(idx, i);
    });
    edgeAdjacency = buildEdgeAdjacency(mesh);

    renderMesh(mesh);
    renderEventNodes(spine.tagged);
    renderNeuronImpulses(mesh);

    if (!viz.dataset.glitchLoop) {
      viz.dataset.glitchLoop = "1";
      window.setTimeout(fireNeuronBurst, 120);
      window.setTimeout(fireNeuronBurst, 380);
      scheduleNeuronFire();
      scheduleEventDotGlitch();
    }

    spine.tagged.forEach((p) => {
      if (!p.node) return;
      const itemRect = p.item.getBoundingClientRect();
      const offsetX = itemRect.left - vizRect.left;
      const offsetY = itemRect.top - vizRect.top;
      (p.node as HTMLElement).style.left = `${p.x - offsetX}px`;
      (p.node as HTMLElement).style.top = `${p.y - offsetY}px`;
    });
  };

  items.forEach((item, i) => {
    item.addEventListener("mouseenter", () => {
      eventsGroup.querySelectorAll(".news-neuron").forEach((n) => n.classList.remove("is-hover"));
      eventsGroup.querySelector(`.news-neuron[data-event-i="${i}"]`)?.classList.add("is-hover");
    });
    item.addEventListener("mouseleave", () => {
      eventsGroup.querySelectorAll(".news-neuron").forEach((n) => n.classList.remove("is-hover"));
    });
  });

  seedClouds();
  layout();
  window.addEventListener("resize", layout, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(layout));

  const reveals = Array.from(viz.querySelectorAll(".timeline-reveal"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  reveals.forEach((node) => observer.observe(node));
}

/** Connected portrait mesh, traveling light trails, and uneven stars. */

export type RoughMesh = {
  v: number;
  w: number;
  h: number;
  sparks: number[];
  lines?: number[];
  lineCount?: number;
  sparkCount?: number;
};

const CACHE_KEY = "wireframeRoughMesh:v12";

export function readCachedRoughMesh(): RoughMesh | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoughMesh;
    if (parsed?.v !== 12 || !parsed.sparks?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function forgetDrawnMesh() {
  try {
    localStorage.removeItem("wireframeDrawnMesh:v1");
    localStorage.removeItem("wireframeDrawnMesh:v2");
    localStorage.removeItem("wireframeDrawnMesh:v3");
  } catch {
    /* private mode */
  }
}

function storeRoughMesh(mesh: RoughMesh) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(mesh));
  } catch {
    /* quota — the network copy is still fine */
  }
}

export async function loadRoughMesh(url: string): Promise<RoughMesh | null> {
  const cached = readCachedRoughMesh();
  if (cached) return cached;
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const mesh = (await res.json()) as RoughMesh;
    if (mesh?.v !== 12 || !mesh.sparks?.length) return null;
    storeRoughMesh(mesh);
    return mesh;
  } catch {
    return null;
  }
}

export function sparkBudget() {
  const mobile = window.matchMedia("(max-width: 800px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (mobile || coarse) return 720;
  return 1500;
}

type LiveSpark = {
  slot: number;
  born: number;
  life: number;
  speed: number;
  size: number;
  tint: number;
  resident: boolean;
};
type Ship = {
  slot: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: number;
  leftBorn: number;
  speed: number;
  trail: number[];
  glowFor: number;
  glowUntil: number;
  lostSince: number;
  movedAt: number;
  zone: "hat" | "torso" | "neck";
};

type BlackHole = { x: number; y: number; phase: number; size: number };
type Tether = {
  x: number;
  y: number;
  width: number;
  kinks: { t: number; side: number; amp: number }[];
};
type Explosion = {
  x: number;
  y: number;
  born: number;
  life: number;
  scale: number;
  bits: { ang: number; span: number; len: number; width: number }[];
};

type PointerState = {
  active: boolean;
  dragging: boolean;
  x: number;
  y: number;
  yaw: number;
  yawVel: number;
  tiltX: number;
  tiltY: number;
  panX: number;
  panY: number;
};

export function startMeshSparkle(
  canvas: HTMLCanvasElement,
  mesh: RoughMesh,
  opts: { light: () => boolean; reduced: boolean; portraitSrc: string | null }
): () => void {
  let alive = true;
  let raf = 0;
  let last = performance.now();
  let sparkCount = Math.floor(mesh.sparks.length / 3);
  const compact =
    opts.reduced ||
    window.matchMedia("(max-width: 800px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  const live: LiveSpark[] = [];
  const sparkGrid = indexPoints(mesh.sparks, 3);
  const lineCap = compact ? 3200 : 9000;
  const triCap = compact ? 2200 : 6400;
  const drawnLines: number[] = [];
  const drawnTris: number[] = [];
  const edgeSeen = new Set<string>();
  const pointCells = new Map<number, { x: number; y: number }[]>();
  const tethers: Tether[] = [];
  let holes = placeHoles(mesh, null);
  const explosions: Explosion[] = [];
  forgetDrawnMesh();
  const rememberPoint = (x: number, y: number) => {
    const key = cellKey(x, y);
    const list = pointCells.get(key);
    if (!list) {
      pointCells.set(key, [{ x, y }]);
      return;
    }
    if (list.length >= 28) return;
    for (const point of list) {
      if (Math.hypot(point.x - x, point.y - y) < 1.4) return;
    }
    list.push({ x, y });
  };
  const ships: Ship[] = [];
  const started = performance.now();
  let photo: ImageData | null = null;
  const pointer: PointerState = {
    active: false,
    dragging: false,
    x: mesh.w * 0.5,
    y: mesh.h * 0.4,
    yaw: 0,
    yawVel: 0,
    tiltX: 0,
    tiltY: 0,
    panX: 0,
    panY: 0,
  };
  let lastClientX = 0;
  let lastClientY = 0;

  const meshPoint = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const crop = frameBottom(mesh);
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * mesh.w,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * crop,
    };
  };

  const onEnter = (event: PointerEvent) => {
    const pos = meshPoint(event);
    pointer.active = true;
    pointer.x = pos.x;
    pointer.y = pos.y;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
  };
  const onDown = (event: PointerEvent) => {
    onEnter(event);
    pointer.dragging = true;
    stage.style.cursor = "grabbing";
    stage.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    const pos = meshPoint(event);
    pointer.active = true;
    pointer.x = pos.x;
    pointer.y = pos.y;
    if (!pointer.dragging) return;
    const dx = event.clientX - lastClientX;
    const dy = event.clientY - lastClientY;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    pointer.yaw = clampYaw(pointer.yaw + dx * 0.0032);
    pointer.yawVel = dx * 0.0004;
    pointer.panX = Math.max(-18, Math.min(18, pointer.panX + dx * 0.05));
    pointer.panY = Math.max(-8, Math.min(8, pointer.panY + dy * 0.04));
  };
  const onUp = (event: PointerEvent) => {
    pointer.dragging = false;
    stage.style.cursor = "grab";
    try {
      stage.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    onEnter(event);
  };
  const onLeave = () => {
    pointer.active = false;
    pointer.dragging = false;
    stage.style.cursor = "grab";
  };

  const stage = canvas.parentElement ?? canvas;
  stage.style.cursor = "grab";
  stage.style.touchAction = "none";
  stage.addEventListener("pointerenter", onEnter);
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  stage.addEventListener("pointerleave", onLeave);

  if (opts.portraitSrc) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      const sample = document.createElement("canvas");
      sample.width = mesh.w;
      sample.height = mesh.h;
      const ictx = sample.getContext("2d", { willReadFrequently: true });
      if (!ictx) return;
      ictx.drawImage(img, 0, 0, mesh.w, mesh.h);
      photo = ictx.getImageData(0, 0, mesh.w, mesh.h);
      holes = placeHoles(mesh, photo);
    };
    img.src = opts.portraitSrc;
  }

  const randomSlot = () => {
    for (let n = 0; n < 14; n++) {
      const slot = Math.floor(Math.random() * Math.max(1, sparkCount));
      const x = mesh.sparks[slot * 3];
      const y = mesh.sparks[slot * 3 + 1];
      if (inBust(mesh, x, y)) return slot;
    }
    return Math.floor(Math.random() * Math.max(1, sparkCount));
  };
  const starCap = () => (compact ? 120 : 260);
  const keepStars = () => (compact ? 24 : 52);
  const rollLife = () => ({
    life: 2400 + Math.random() * 4600,
    speed: 0.16 + Math.random() * 0.28,
    size: 0.45 + Math.random() * 0.75,
    tint: Math.random(),
    resident: false,
  });
  const spawn = (now: number) => {
    if (sparkCount < 1) return;
    let residents = 0;
    for (const spark of live) if (spark.resident) residents++;
    live.push({ slot: randomSlot(), born: now, ...rollLife(), resident: residents < keepStars() });
  };
  const addEdge = (ax: number, ay: number, bx: number, by: number) => {
    const dist = Math.hypot(bx - ax, by - ay);
    if (dist < 4.2) return false;
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const limit = inHat(mesh, mx, my) ? 32 : inTorso(mesh, mx, my) ? 28 : inChinNeck(mesh, mx, my) ? 24 : 12;
    if (dist > limit) return false;
    if (!inBust(mesh, mx, my)) return false;
    if (!zonesLink(portraitZone(mesh, ax, ay), portraitZone(mesh, bx, by))) return false;
    if (drawnLines.length / 4 >= lineCap) return false;
    const key = edgeKey(ax, ay, bx, by);
    if (edgeSeen.has(key)) return false;
    edgeSeen.add(key);
    drawnLines.push(ax, ay, bx, by);
    rememberPoint(ax, ay);
    rememberPoint(bx, by);
    if (tethers.length < 200 && Math.random() < 0.08) tethers.push(makeTether(ax, ay));
    return true;
  };
  const findThird = (ax: number, ay: number, bx: number, by: number) => {
    const cx = (ax / MESH_CELL) | 0;
    const cy = (ay / MESH_CELL) | 0;
    const picks: { x: number; y: number }[] = [];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = pointCells.get((cx + ox) * 8192 + (cy + oy));
        if (!list) continue;
        for (const point of list) {
          const da = Math.hypot(point.x - ax, point.y - ay);
          const db = Math.hypot(point.x - bx, point.y - by);
          if (da < 4.2 || da > 15 || db < 4.2 || db > 15) continue;
          const cross = (bx - ax) * (point.y - ay) - (by - ay) * (point.x - ax);
          if (Math.abs(cross) < 10) continue;
          picks.push(point);
          if (picks.length >= 8) break;
        }
      }
    }
    if (picks.length) return picks[(Math.random() * picks.length) | 0];
    const near = nearestPoint(sparkGrid, mesh.sparks, 3, (ax + bx) * 0.5, (ay + by) * 0.5, 16);
    if (near < 0) return null;
    const x = mesh.sparks[near * 3];
    const y = mesh.sparks[near * 3 + 1];
    const da = Math.hypot(x - ax, y - ay);
    const db = Math.hypot(x - bx, y - by);
    if (da < 4.2 || da > 15 || db < 4.2 || db > 15) return null;
    return { x, y };
  };
  const commitHop = (ax: number, ay: number, bx: number, by: number) => {
    const linked = addEdge(ax, ay, bx, by);
    if (drawnTris.length / 6 >= triCap) return;
    for (let n = 0; n < 2; n++) {
      const third = findThird(ax, ay, bx, by);
      if (!third) break;
      const left = addEdge(ax, ay, third.x, third.y);
      const right = addEdge(bx, by, third.x, third.y);
      if (linked || left || right) drawnTris.push(ax, ay, bx, by, third.x, third.y);
    }
  };
  const layRoute = (ax: number, ay: number, bx: number, by: number, zone: Ship["zone"]) => {
    const dist = Math.hypot(bx - ax, by - ay);
    if (dist < 6) return;
    const steps = Math.max(1, Math.ceil(dist / 14));
    let px = ax;
    let py = ay;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const slot = nearestPoint(sparkGrid, mesh.sparks, 3, x, y, 22);
      const nx = slot >= 0 ? mesh.sparks[slot * 3] : x;
      const ny = slot >= 0 ? mesh.sparks[slot * 3 + 1] : y;
      if (!shipInZone(mesh, zone, nx, ny) || !shipInZone(mesh, zone, px, py)) {
        px = nx;
        py = ny;
        continue;
      }
      commitHop(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  };
  const placeShip = (ship: Ship, now: number) => {
    let slot = randomSlot();
    for (let n = 0; n < 24; n++) {
      const candidate = live.length && Math.random() < 0.7 ? live[(Math.random() * live.length) | 0].slot : randomSlot();
      const cx = mesh.sparks[candidate * 3];
      const cy = mesh.sparks[candidate * 3 + 1];
      if (shipInZone(mesh, ship.zone, cx, cy)) {
        slot = candidate;
        break;
      }
    }
    const nx = mesh.sparks[slot * 3] ?? mesh.w * 0.5;
    const ny = mesh.sparks[slot * 3 + 1] ?? mesh.h * 0.4;
    if (Math.hypot(nx - ship.x, ny - ship.y) > 22) layRoute(ship.x, ship.y, nx, ny, ship.zone);
    ship.slot = slot;
    ship.x = nx;
    ship.y = ny;
    ship.tx = nx;
    ship.ty = ny;
    ship.target = -1;
    ship.leftBorn = live.find((spark) => spark.slot === slot)?.born ?? now;
    ship.trail = [];
    ship.glowUntil = now;
    ship.lostSince = 0;
    ship.movedAt = now;
  };
  const pickLaterStar = (x: number, y: number, avoid: number, zone: Ship["zone"]) => {
    let newest = -Infinity;
    const near: { slot: number; born: number }[] = [];
    for (const spark of live) {
      if (spark.slot === avoid) continue;
      const sx = mesh.sparks[spark.slot * 3];
      const sy = mesh.sparks[spark.slot * 3 + 1];
      const dist = Math.hypot(sx - x, sy - y);
      if (dist < 12 || dist > (zone === "neck" ? 120 : 220) || !shipInZone(mesh, zone, sx, sy)) continue;
      near.push({ slot: spark.slot, born: spark.born });
      if (spark.born > newest) newest = spark.born;
    }
    const later = near.filter((spark) => spark.born >= newest - 900);
    const open = (later.length ? later : near).filter((spark) => {
      const sx = mesh.sparks[spark.slot * 3];
      const sy = mesh.sparks[spark.slot * 3 + 1];
      return !edgeSeen.has(edgeKey(x, y, sx, sy));
    });
    const pool = open.length ? open : later.length ? later : near;
    if (!pool.length) return -1;
    return pool[(Math.random() * pool.length) | 0].slot;
  };
  const pickNav = (x: number, y: number, gx: number, gy: number, zone: Ship["zone"]) => {
    const here = Math.hypot(gx - x, gy - y);
    const cx = (x / MESH_CELL) | 0;
    const cy = (y / MESH_CELL) | 0;
    const options: { index: number; goal: number }[] = [];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = sparkGrid.get((cx + ox) * 8192 + (cy + oy));
        if (!list) continue;
        for (const index of list) {
          const sx = mesh.sparks[index * 3];
          const sy = mesh.sparks[index * 3 + 1];
          const step = Math.hypot(sx - x, sy - y);
          if (step < 3.6 || step > (zone === "neck" ? 16 : 24) || !shipInZone(mesh, zone, sx, sy)) continue;
          options.push({ index, goal: Math.hypot(gx - sx, gy - sy) });
        }
      }
    }
    const forward = options.filter((option) => option.goal < here - 0.4);
    const pool = (forward.length ? forward : options).sort((a, b) => a.goal - b.goal);
    if (!pool.length) return -1;
    const band = pool.slice(0, Math.min(5, pool.length));
    return band[(Math.random() * band.length) | 0].index;
  };
  const openNeighbor = (x: number, y: number, zone: Ship["zone"]) => {
    const cx = (x / MESH_CELL) | 0;
    const cy = (y / MESH_CELL) | 0;
    const reach = zone === "neck" ? 24 : zone === "hat" ? 32 : 28;
    const picks: number[] = [];
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const list = sparkGrid.get((cx + ox) * 8192 + (cy + oy));
        if (!list) continue;
        for (const index of list) {
          const sx = mesh.sparks[index * 3];
          const sy = mesh.sparks[index * 3 + 1];
          const dist = Math.hypot(sx - x, sy - y);
          if (dist < 5 || dist > reach || !shipInZone(mesh, zone, sx, sy)) continue;
          if (edgeSeen.has(edgeKey(x, y, sx, sy))) continue;
          picks.push(index);
          if (picks.length >= 12) return picks[(Math.random() * picks.length) | 0];
        }
      }
    }
    if (!picks.length) return -1;
    return picks[(Math.random() * picks.length) | 0];
  };
  const randomNear = (origin: number, x: number, y: number, maxDist: number, skip: number) => {
    const cx = (x / MESH_CELL) | 0;
    const cy = (y / MESH_CELL) | 0;
    const picks: number[] = [];
    const span = maxDist > 20 ? 2 : 1;
    for (let oy = -span; oy <= span; oy++) {
      for (let ox = -span; ox <= span; ox++) {
        const list = sparkGrid.get((cx + ox) * 8192 + (cy + oy));
        if (!list) continue;
        for (const index of list) {
          if (index === origin || index === skip) continue;
          const dist = Math.hypot(mesh.sparks[index * 3] - x, mesh.sparks[index * 3 + 1] - y);
          if (dist < 4.2 || dist > maxDist) continue;
          picks.push(index);
          if (picks.length >= 14) break;
        }
      }
    }
    if (!picks.length) return -1;
    return picks[(Math.random() * picks.length) | 0];
  };
  const closeTriangle = (origin: number, reach: number) => {
    const x = mesh.sparks[origin * 3];
    const y = mesh.sparks[origin * 3 + 1];
    const a = randomNear(origin, x, y, reach, -1);
    if (a < 0) return false;
    const ax = mesh.sparks[a * 3];
    const ay = mesh.sparks[a * 3 + 1];
    const b = randomNear(origin, x, y, reach, a);
    if (b < 0) return false;
    const bx = mesh.sparks[b * 3];
    const by = mesh.sparks[b * 3 + 1];
    if (Math.hypot(bx - ax, by - ay) > reach) return false;
    const cross = (ax - x) * (by - y) - (ay - y) * (bx - x);
    if (Math.abs(cross) < 12) return false;
    const ab = addEdge(x, y, ax, ay);
    const ac = addEdge(x, y, bx, by);
    const bc = addEdge(ax, ay, bx, by);
    if (!(ab || ac || bc) || drawnTris.length / 6 >= triCap) return ab || ac || bc;
    drawnTris.push(x, y, ax, ay, bx, by);
    return true;
  };
  const budget = compact ? 700 : 1800;
  let made = 0;
  for (let n = 0; n < sparkCount * 2 && made < budget; n++) {
    const i = (Math.random() * sparkCount) | 0;
    const x = mesh.sparks[i * 3];
    const y = mesh.sparks[i * 3 + 1];
    if (inChinNeck(mesh, x, y)) {
      if (closeTriangle(i, 16)) made++;
      continue;
    }
    if (inHat(mesh, x, y) && Math.random() < 0.55 && closeTriangle(i, 30)) made++;
    else if (inTorso(mesh, x, y) && Math.random() < 0.42 && closeTriangle(i, 26)) made++;
  }

  const frame = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const age = now - started;
    const cap = starCap();
    const progress = Math.min(1, Math.log(1 + age / 80) / Math.log(1 + 50000 / 80));
    const target = Math.round(cap * progress);
    if (live.length < target) {
      const batch = Math.min(target - live.length, progress < 0.4 ? (compact ? 10 : 22) : compact ? 2 : 3);
      for (let i = 0; i < batch; i++) spawn(now);
    }
    const starsReady = age > 5200 && live.length >= Math.round(cap * 0.62);
    if (!opts.reduced && starsReady) {
      const shipLimit = Math.min(compact ? 3 : 5, Math.floor(live.length / 18));
      if (ships.length < shipLimit) {
        const ship = makeShip(mesh, (["hat", "neck", "torso", "hat", "neck"] as const)[ships.length % 5]);
        placeShip(ship, now);
        ships.push(ship);
      }
    }
    if (!pointer.dragging) {
      pointer.yaw = clampYaw(pointer.yaw + pointer.yawVel);
      if (Math.abs(pointer.yaw) >= YAW_LIMIT - 0.001) pointer.yawVel *= 0.45;
      pointer.yawVel *= 0.94;
    }
    const aimX = pointer.active ? ((pointer.x - mesh.w * 0.5) / mesh.w) * 0.18 : 0;
    const aimY = pointer.active ? ((pointer.y - mesh.h * 0.38) / mesh.h) * 0.12 : 0;
    pointer.tiltX += (aimX - pointer.tiltX) * 0.08;
    pointer.tiltY += (aimY - pointer.tiltY) * 0.08;
    applyPortraitMotion(canvas, pointer, opts.light());

    if (!opts.reduced) {
      for (let i = live.length - 1; i >= 0; i--) {
        const spark = live[i];
        if (spark.resident) continue;
        if ((now - spark.born) * spark.speed < spark.life) continue;
        const next = rollLife();
        spark.slot = Math.random() < 0.5 ? spark.slot : randomSlot();
        spark.born = now;
        spark.life = next.life;
        spark.speed = next.speed;
        spark.size = next.size;
        spark.tint = next.tint;
        spark.resident = false;
      }
    }
    if (!opts.reduced && starsReady) {
      for (const ship of ships) {
        if (ship.target < 0) {
          const next = pickLaterStar(ship.x, ship.y, ship.slot, ship.zone);
          if (next < 0) {
            const open = openNeighbor(ship.x, ship.y, ship.zone);
            if (open >= 0) {
              ship.lostSince = 0;
              ship.target = open;
              ship.tx = ship.x;
              ship.ty = ship.y;
              ship.leftBorn = now;
              continue;
            }
            if (!ship.lostSince) ship.lostSince = now;
            if (now - ship.lostSince > 420) placeShip(ship, now);
            continue;
          }
          ship.lostSince = 0;
          ship.target = next;
          ship.tx = ship.x;
          ship.ty = ship.y;
          ship.leftBorn = live.find((spark) => spark.slot === next)?.born ?? now;
        }
        const gx = mesh.sparks[ship.target * 3];
        const gy = mesh.sparks[ship.target * 3 + 1];
        if (Math.hypot(ship.tx - ship.x, ship.ty - ship.y) < 0.8) {
          if (Math.hypot(gx - ship.x, gy - ship.y) < 16) {
            commitHop(ship.x, ship.y, gx, gy);
            ship.x = gx;
            ship.y = gy;
            ship.tx = gx;
            ship.ty = gy;
            ship.slot = ship.target;
            ship.target = -1;
            ship.movedAt = now;
          } else {
            const nav = pickNav(ship.x, ship.y, gx, gy, ship.zone);
            const open = nav < 0 ? openNeighbor(ship.x, ship.y, ship.zone) : nav;
            if (open < 0 || now - ship.movedAt > 1100) {
              placeShip(ship, now);
              continue;
            }
            ship.tx = mesh.sparks[open * 3];
            ship.ty = mesh.sparks[open * 3 + 1];
            ship.slot = open;
          }
        }
        const dx = ship.tx - ship.x;
        const dy = ship.ty - ship.y;
        const dist = Math.hypot(dx, dy);
        const step = ship.speed * dt * 1.85;
        if (dist >= 0.8) {
          if (dist <= step) {
            commitHop(ship.x, ship.y, ship.tx, ship.ty);
            ship.x = ship.tx;
            ship.y = ship.ty;
            ship.movedAt = now;
          } else {
            ship.x += (dx / dist) * step;
            ship.y += (dy / dist) * step;
            ship.movedAt = now;
          }
        } else if (now - ship.movedAt > 1100) {
          placeShip(ship, now);
          continue;
        }
        if (now >= ship.glowUntil) {
          ship.trail = [];
          ship.glowFor = 280 + Math.random() * 2600;
          ship.glowUntil = now + ship.glowFor;
        }
        const lastPoint = ship.trail.length;
        if (lastPoint < 3 || Math.hypot(ship.x - ship.trail[lastPoint - 3], ship.y - ship.trail[lastPoint - 2]) > 5) {
          ship.trail.push(ship.x, ship.y, now);
        }
        while (ship.trail.length > 3 && now - ship.trail[2] > ship.glowFor) ship.trail.splice(0, 3);
      }
      for (let i = explosions.length - 1; i >= 0; i--) {
        if (now - explosions[i].born > explosions[i].life) explosions.splice(i, 1);
      }
    }
    draw(
      canvas,
      mesh,
      live,
      ships,
      holes,
      tethers,
      explosions,
      drawnLines,
      drawnTris,
      now,
      opts.light(),
      photo,
      pointer
    );
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    stage.removeEventListener("pointerenter", onEnter);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onUp);
    stage.removeEventListener("pointerleave", onLeave);
    canvas.style.transform = "";
    const portrait = document.getElementById("wireframeLightPortrait");
    if (portrait) portrait.style.transform = "";
  };
}

const YAW_LIMIT = 0.24;

function clampYaw(yaw: number) {
  return Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, yaw));
}

function applyPortraitMotion(canvas: HTMLCanvasElement, pointer: PointerState, light: boolean) {
  const stage = canvas.parentElement;
  if (stage) stage.style.transformStyle = "preserve-3d";
  const pan = `translate3d(${pointer.panX.toFixed(1)}px, ${pointer.panY.toFixed(1)}px, 0)`;
  const turn = light ? `${pan} rotateY(${pointer.yaw.toFixed(4)}rad)` : pan;
  canvas.style.transform = turn;
  canvas.style.transformOrigin = "50% 40%";
  canvas.style.transformStyle = "preserve-3d";
  const portrait = document.getElementById("wireframeLightPortrait");
  if (!portrait) return;
  portrait.style.transform = turn;
  portrait.style.transformOrigin = "50% 40%";
  portrait.style.transformStyle = "preserve-3d";
}

function curvePoint(mesh: RoughMesh, x: number, y: number, yaw: number) {
  const bend = Math.min(1, Math.abs(yaw) / 0.08);
  if (bend < 0.02) return { x, y };
  const cx = mesh.w * 0.5;
  const cy = mesh.h * 0.4;
  const nx = Math.max(-1.2, Math.min(1.2, (x - cx) / (mesh.w * 0.46)));
  const span = 1.05;
  const theta = nx * span + yaw;
  const radius = (mesh.w * 0.46) / Math.sin(span);
  const z = radius * (Math.cos(nx * span) - Math.cos(theta));
  const depth = 480 / Math.max(140, 480 + z);
  const curvedX = cx + Math.sin(theta) * radius * depth;
  const curvedY = cy + (y - cy) * depth;
  return {
    x: x + (curvedX - x) * bend,
    y: y + (curvedY - y) * bend,
  };
}

function placeHoles(mesh: RoughMesh, photo: ImageData | null): BlackHole[] {
  const cols = 16;
  const rows = 20;
  const hits = new Uint16Array(cols * rows);
  const dark = new Uint16Array(cols * rows);
  for (let i = 0; i < mesh.sparks.length; i += 6) {
    const c = Math.max(0, Math.min(cols - 1, (mesh.sparks[i] / mesh.w) * cols)) | 0;
    const r = Math.max(0, Math.min(rows - 1, (mesh.sparks[i + 1] / mesh.h) * rows)) | 0;
    hits[r * cols + c]++;
  }
  if (photo) {
    for (let y = 0; y < photo.height; y += 5) {
      for (let x = 0; x < photo.width; x += 5) {
        const i = (y * photo.width + x) * 4;
        const lum = photo.data[i] * 0.3 + photo.data[i + 1] * 0.59 + photo.data[i + 2] * 0.11;
        if (lum > 42 || photo.data[i + 3] < 24) continue;
        const c = Math.max(0, Math.min(cols - 1, (x / photo.width) * cols)) | 0;
        const r = Math.max(0, Math.min(rows - 1, (y / photo.height) * rows)) | 0;
        dark[r * cols + c]++;
      }
    }
  }
  const spots: { x: number; y: number; score: number }[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c;
      const dim = photo ? dark[i] : hits[i] < 2 ? 4 : 0;
      if (dim < 2 || hits[i] > 3) continue;
      spots.push({
        x: ((c + 0.15 + Math.random() * 0.7) / cols) * mesh.w,
        y: ((r + 0.15 + Math.random() * 0.7) / rows) * mesh.h,
        score: dim * 4 + (hits[i] === 0 ? 5 : 0),
      });
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = spots[i];
    spots[i] = spots[j];
    spots[j] = swap;
  }
  spots.sort((a, b) => b.score - a.score);
  const picked: BlackHole[] = [];
  const want = 5 + Math.floor(Math.random() * 4);
  for (const spot of spots) {
    if (picked.length >= want) break;
    if (picked.some((hole) => Math.hypot(hole.x - spot.x, hole.y - spot.y) < mesh.w * 0.09)) continue;
    picked.push({
      x: spot.x,
      y: spot.y,
      phase: Math.random() * Math.PI * 2,
      size: 0.45 + Math.random() * 0.7,
    });
  }
  return picked;
}

function makeTether(x: number, y: number): Tether {
  const kinks = [];
  const kinkCount = 1 + Math.floor(Math.random() * 3);
  for (let k = 0; k < kinkCount; k++) {
    kinks.push({
      t: (k + 1) / (kinkCount + 1) + (Math.random() - 0.5) * 0.08,
      side: Math.random() > 0.5 ? 1 : -1,
      amp: 3 + Math.random() * 14,
    });
  }
  return { x, y, width: 0.35 + Math.random() * 2.4, kinks };
}

function makeShip(mesh: RoughMesh, zone: Ship["zone"]): Ship {
  const count = Math.max(1, Math.floor(mesh.sparks.length / 3));
  const slot = Math.floor(Math.random() * count);
  const x = mesh.sparks[slot * 3] ?? mesh.w * 0.5;
  const y = mesh.sparks[slot * 3 + 1] ?? mesh.h * 0.4;
  return {
    slot,
    x,
    y,
    tx: x,
    ty: y,
    target: -1,
    leftBorn: 0,
    speed: 42 + Math.random() * 90,
    trail: [],
    glowFor: 280 + Math.random() * 2600,
    glowUntil: 0,
    lostSince: 0,
    movedAt: 0,
    zone,
  };
}

function makeExplosion(x: number, y: number, now: number): Explosion {
  const count = 5 + Math.floor(Math.random() * 9);
  const bits = [];
  for (let i = 0; i < count; i++) {
    bits.push({
      ang: Math.random() * Math.PI * 2,
      span: 0.15 + Math.random() * 0.85,
      len: 0.25 + Math.random() * 1.4,
      width: 0.4 + Math.random() * 2.2,
    });
  }
  return {
    x,
    y,
    born: now,
    life: 380 + Math.random() * 520,
    scale: 0.45 + Math.random() * 1.7,
    bits,
  };
}

const MESH_CELL = 24;

function cellKey(x: number, y: number) {
  return ((x / MESH_CELL) | 0) * 8192 + ((y / MESH_CELL) | 0);
}

function indexPoints(coords: number[], stride: number) {
  const grid = new Map<number, number[]>();
  const count = Math.floor(coords.length / stride);
  for (let i = 0; i < count; i++) {
    const key = cellKey(coords[i * stride], coords[i * stride + 1]);
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  }
  return grid;
}

function edgeKey(ax: number, ay: number, bx: number, by: number) {
  const q = (n: number) => Math.round(n / 2);
  const a = `${q(ax)},${q(ay)}`;
  const b = `${q(bx)},${q(by)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function nearestPoint(grid: Map<number, number[]>, coords: number[], stride: number, x: number, y: number, maxDist: number) {
  const cx = (x / MESH_CELL) | 0;
  const cy = (y / MESH_CELL) | 0;
  let best = -1;
  let bestDist = maxDist;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const list = grid.get((cx + ox) * 8192 + (cy + oy));
      if (!list) continue;
      for (const index of list) {
        const dist = Math.hypot(coords[index * stride] - x, coords[index * stride + 1] - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      }
    }
  }
  return best;
}


function draw(
  canvas: HTMLCanvasElement,
  mesh: RoughMesh,
  live: LiveSpark[],
  ships: Ship[],
  holes: BlackHole[],
  tethers: Tether[],
  explosions: Explosion[],
  drawnLines: number[],
  drawnTris: number[],
  now: number,
  light: boolean,
  photo: ImageData | null,
  pointer: PointerState
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssW = canvas.clientWidth || mesh.w;
  const cssH = canvas.clientHeight || mesh.h;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pxW = Math.max(1, Math.round(cssW * dpr));
  const pxH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const crop = frameBottom(mesh);
  const scale = Math.max(pxW / mesh.w, pxH / crop);
  const offsetX = (pxW - mesh.w * scale) / 2;
  const offsetY = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.beginPath();
  ctx.rect(0, 0, mesh.w, crop);
  ctx.clip();
  const px = dpr / Math.max(0.001, scale);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  const lines = drawnLines;
  const yaw = pointer.yaw;
  const placed = (x: number, y: number) => {
    if (pointer.active) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 42 && dist > 0.001) {
        const push = (1 - dist / 42) * 6;
        x += (dx / dist) * push;
        y += (dy / dist) * push;
      }
    }
    return curvePoint(mesh, x, y, yaw);
  };
  for (const hole of holes) {
    const hx = hole.x + Math.sin(now * 0.00035 + hole.phase) * 4;
    const hy = hole.y + Math.cos(now * 0.00028 + hole.phase) * 3;
    const p = curvePoint(mesh, hx, hy, yaw);
    const radius = (1.1 + hole.size * 0.9) * px;
    ctx.fillStyle = light ? "rgba(12, 12, 16, 0.28)" : "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bucket of lineBuckets) bucket.length = 0;
  for (const bucket of bustBuckets) bucket.length = 0;
  const glowRate = light ? 0.00012 : 0.00038;
  for (let i = 0; i < lines.length; i += 4) {
    const span = Math.hypot(lines[i + 2] - lines[i], lines[i + 3] - lines[i + 1]);
    if (span > 30 || !inBust(mesh, lines[i], lines[i + 1]) || !inBust(mesh, lines[i + 2], lines[i + 3])) continue;
    const section = ((lines[i] / 56) | 0) * 9.7 + ((lines[i + 1] / 56) | 0) * 6.3;
    const glow = 0.5 + 0.5 * Math.sin(now * glowRate + section);
    const bucket = Math.min(bustBuckets.length - 1, (glow * bustBuckets.length) | 0);
    bustBuckets[bucket].push(i);
  }
  if (drawnTris.length >= 6) {
    if (light) {
      for (const list of faceBuckets.values()) list.length = 0;
      const triCount = drawnTris.length / 6;
      for (let t = 0; t < triCount; t++) {
        const o = t * 6;
        if (!triInside(mesh, drawnTris, o)) continue;
        const tone = quantizeColor(
          photo,
          (drawnTris[o] + drawnTris[o + 2] + drawnTris[o + 4]) / 3,
          (drawnTris[o + 1] + drawnTris[o + 3] + drawnTris[o + 5]) / 3
        );
        const list = faceBuckets.get(tone);
        if (list) list.push(t);
        else faceBuckets.set(tone, [t]);
      }
      for (const [tone, list] of faceBuckets) {
        if (!list.length) continue;
        ctx.beginPath();
        for (const t of list) {
          const f = t * 6;
          if (!triInside(mesh, drawnTris, f)) continue;
          const a = placed(drawnTris[f], drawnTris[f + 1]);
          const b = placed(drawnTris[f + 2], drawnTris[f + 3]);
          const c = placed(drawnTris[f + 4], drawnTris[f + 5]);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
        }
        ctx.fillStyle = `rgba(${tone},0.32)`;
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      for (let i = 0; i < drawnTris.length; i += 6) {
        if (!triInside(mesh, drawnTris, i)) continue;
        const a = placed(drawnTris[i], drawnTris[i + 1]);
        const b = placed(drawnTris[i + 2], drawnTris[i + 3]);
        const c = placed(drawnTris[i + 4], drawnTris[i + 5]);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.closePath();
      }
      ctx.fillStyle = "rgba(120, 230, 186, 0.22)";
      ctx.fill();
    }
  }
  for (let b = 0; b < bustBuckets.length; b++) {
    if (!bustBuckets[b].length) continue;
    const glow = (b + 0.45) / bustBuckets.length;
    ctx.beginPath();
    for (const i of bustBuckets[b]) {
      const a = placed(lines[i], lines[i + 1]);
      const bpt = placed(lines[i + 2], lines[i + 3]);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(bpt.x, bpt.y);
    }
    if (light) {
      ctx.strokeStyle = `rgba(8, 24, 18,${(0.45 + glow * 0.4).toFixed(3)})`;
      ctx.lineWidth = 1.45 * px;
      ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(186, 255, 226,${(0.7 + glow * 0.28).toFixed(3)})`;
      ctx.lineWidth = 1.05 * px;
      ctx.stroke();
    }
  }

  if (light) {
    for (const tether of tethers) {
      const lifted = curvePoint(mesh, tether.x, tether.y, yaw);
      const dx = lifted.x - tether.x;
      const dy = lifted.y - tether.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const tone = "16, 32, 26";
      const bend = Math.min(1, len / 36);
      ctx.strokeStyle = `rgba(${tone},0.5)`;
      ctx.lineWidth = tether.width * px;
      ctx.beginPath();
      ctx.moveTo(tether.x, tether.y);
      for (const kink of tether.kinks) {
        const amp = kink.amp * bend;
        const x = tether.x + dx * kink.t + nx * kink.side * amp;
        const y = tether.y + dy * kink.t + ny * kink.side * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(lifted.x, lifted.y);
      ctx.stroke();
    }
  }

  for (const ship of ships) {
    const trail = ship.trail;
    if (trail.length >= 6) {
      for (let i = 3; i < trail.length; i += 3) {
        const life = 1 - (now - trail[i + 2]) / ship.glowFor;
        if (life <= 0) continue;
        const a = curvePoint(mesh, trail[i - 3], trail[i - 2], yaw);
        const b = curvePoint(mesh, trail[i], trail[i + 1], yaw);
        ctx.strokeStyle = light
          ? `rgba(8, 24, 18,${(0.45 + life * 0.55).toFixed(3)})`
          : `rgba(190, 255, 226,${(life * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1.35 * px;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    const head = curvePoint(mesh, ship.x, ship.y, yaw);
    const ang = Math.atan2(ship.ty - ship.y, ship.tx - ship.x);
    const nose = (light ? 5.6 : 3.4) * px;
    ctx.beginPath();
    ctx.moveTo(head.x + Math.cos(ang) * nose, head.y + Math.sin(ang) * nose);
    ctx.lineTo(head.x + Math.cos(ang + 2.4) * nose * 0.72, head.y + Math.sin(ang + 2.4) * nose * 0.72);
    ctx.lineTo(head.x + Math.cos(ang - 2.4) * nose * 0.72, head.y + Math.sin(ang - 2.4) * nose * 0.72);
    ctx.closePath();
    ctx.fillStyle = light ? "rgba(8, 22, 16, 0.96)" : "rgba(245, 255, 250, 0.95)";
    ctx.fill();
    if (light) {
      ctx.strokeStyle = "rgba(255, 248, 230, 0.95)";
      ctx.lineWidth = Math.max(1, 1.2 * px);
      ctx.stroke();
    }
  }

  for (const boom of explosions) {
    const u = (now - boom.born) / boom.life;
    if (u < 0 || u > 1) continue;
    const center = curvePoint(mesh, boom.x, boom.y, yaw);
    const fade = 1 - u;
    const reach = (10 + u * 28) * boom.scale * px;
    for (const bit of boom.bits) {
      const start = bit.span * reach;
      const end = start + bit.len * reach * (0.35 + u);
      const wobble = Math.sin(bit.ang * 3 + u * 6) * reach * 0.08;
      const x1 = center.x + Math.cos(bit.ang) * start + Math.sin(bit.ang) * wobble;
      const y1 = center.y + Math.sin(bit.ang) * start - Math.cos(bit.ang) * wobble;
      const x2 = center.x + Math.cos(bit.ang + u * 0.4) * end;
      const y2 = center.y + Math.sin(bit.ang + u * 0.6) * end;
      ctx.strokeStyle = `rgba(255, ${140 + Math.floor(bit.width * 40)}, 80, ${fade.toFixed(3)})`;
      ctx.lineWidth = bit.width * fade * px;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 230, 170, ${(fade * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x2, y2, bit.width * 0.8 * px, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < live.length; i++) {
    const spark = live[i];
    const u = spark.resident ? Math.min(1, (now - spark.born) / 800) : ((now - spark.born) * spark.speed) / spark.life;
    if (!spark.resident && (u < 0 || u > 1)) continue;
    const bright = spark.resident
      ? 0.62 + 0.38 * Math.abs(Math.sin(now * 0.0011 + spark.slot))
      : light
        ? novaBrightness(u)
        : starBrightness(u, spark.slot);
    if (bright < 0.03) continue;
    const o = spark.slot * 3;
    let x = mesh.sparks[o];
    let y = mesh.sparks[o + 1];
    if (!inBust(mesh, x, y)) continue;
    const curved = placed(x, y);
    x = curved.x;
    y = curved.y;
    const rgb = light
      ? sampleColor(photo, mesh.sparks[o], mesh.sparks[o + 1]) ?? "214, 186, 156"
      : "186, 255, 214";
    const radius = (0.7 + bright * (light ? 1.8 : 1.35)) * spark.size * px;
    if (light) {
      ctx.fillStyle = `rgba(12, 16, 14,${(0.55 + bright * 0.4).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${rgb},${(0.75 + bright * 0.25).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 250, 236,${(0.55 + bright * 0.45).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8 * px, radius * 0.42), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(${rgb},${(bright * 0.34).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * (1.5 + bright), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${rgb},${(0.35 + bright * 0.65).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const lineBuckets: number[][] = [[], [], [], [], []];
const bustBuckets: number[][] = [[], [], [], [], []];
const faceBuckets = new Map<string, number[]>();
const lineColorBuckets = new Map<string, number[]>();

function triInside(mesh: RoughMesh, tris: number[], offset: number) {
  return (
    inBust(mesh, tris[offset], tris[offset + 1]) &&
    inBust(mesh, tris[offset + 2], tris[offset + 3]) &&
    inBust(mesh, tris[offset + 4], tris[offset + 5])
  );
}

function frameBottom(mesh: RoughMesh) {
  return Math.min(mesh.h, mesh.w);
}

function inBust(mesh: RoughMesh, x: number, y: number) {
  const bottom = frameBottom(mesh);
  return x > mesh.w * 0.1 && x < mesh.w * 0.9 && y > bottom * 0.02 && y < bottom * 0.98;
}

type PortraitZone = "hat" | "face" | "neck" | "torso";

function portraitZone(mesh: RoughMesh, x: number, y: number): PortraitZone | null {
  const bottom = frameBottom(mesh);
  const nx = x / mesh.w;
  const ny = y / bottom;
  if (nx < 0.1 || nx > 0.9 || ny < 0.02 || ny > 0.98) return null;
  if (ny >= 0.47 && ny < 0.72 && nx > 0.34 && nx < 0.66) return "neck";
  if (ny < 0.38 && (ny < 0.32 || nx < 0.3 || nx > 0.7)) return "hat";
  if (ny < 0.52 && nx > 0.26 && nx < 0.74) return "face";
  if (ny >= 0.52) return "torso";
  return "hat";
}

function zonesLink(a: PortraitZone | null, b: PortraitZone | null) {
  if (!a || !b || a === b) return Boolean(a && b);
  const pair = a < b ? `${a}-${b}` : `${b}-${a}`;
  return pair === "face-hat" || pair === "face-neck" || pair === "neck-torso";
}

function shipInZone(mesh: RoughMesh, zone: Ship["zone"], x: number, y: number) {
  const here = portraitZone(mesh, x, y);
  if (zone === "neck") return here === "neck" || (here === "face" && y > frameBottom(mesh) * 0.46);
  return here === zone;
}

function inHat(mesh: RoughMesh, x: number, y: number) {
  return portraitZone(mesh, x, y) === "hat";
}

function inTorso(mesh: RoughMesh, x: number, y: number) {
  return portraitZone(mesh, x, y) === "torso";
}

function inChinNeck(mesh: RoughMesh, x: number, y: number) {
  return shipInZone(mesh, "neck", x, y);
}

function sampleColor(photo: ImageData | null, x: number, y: number) {
  if (!photo) return null;
  const px = Math.max(0, Math.min(photo.width - 1, x | 0));
  const py = Math.max(0, Math.min(photo.height - 1, y | 0));
  const i = (py * photo.width + px) * 4;
  if (photo.data[i + 3] < 16) return null;
  return `${photo.data[i]}, ${photo.data[i + 1]}, ${photo.data[i + 2]}`;
}

function quantizeColor(photo: ImageData | null, x: number, y: number) {
  const raw = sampleColor(photo, x, y);
  if (!raw) return "48, 42, 36";
  const parts = raw.split(",");
  const snap = (value: string) => Math.max(0, Math.min(255, Math.round(Number(value) / 28) * 28));
  return `${snap(parts[0])}, ${snap(parts[1])}, ${snap(parts[2])}`;
}

function novaBrightness(u: number) {
  if (u < 0.2) return u / 0.2;
  if (u > 0.55) return Math.max(0, 1 - (u - 0.55) / 0.45);
  return 1;
}

function starBrightness(u: number, phase: number) {
  const blink = 0.12 + 0.88 * Math.abs(Math.sin(phase * 1.7 + u * 52));
  if (u < 0.12) return (u / 0.12) * blink;
  if (u > 0.48) {
    const fade = (u - 0.48) / 0.52;
    return Math.max(0, 1 - fade) * (fade > 0.62 ? blink : 1);
  }
  return 1;
}

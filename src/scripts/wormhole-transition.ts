/** 80s VHS wormhole transition — scanlines, static, tunnel rings, chromatic pull. */

const WORMHOLE_MS = 2400;

type Streak = {
  angle: number;
  dist: number;
  speed: number;
  width: number;
  hue: number;
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInQuart(t: number) {
  return t * t * t * t;
}

export function playWormholeTransition(
  originX: number,
  originY: number,
  href: string
): void {
  if (typeof document === "undefined") return;

  const overlay = document.createElement("div");
  overlay.className = "wormhole-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.className = "wormhole-overlay__canvas";
  overlay.appendChild(canvas);

  const scan = document.createElement("div");
  scan.className = "wormhole-overlay__scanlines";
  overlay.appendChild(scan);

  const signal = document.createElement("div");
  signal.className = "wormhole-overlay__signal";
  signal.textContent = "DIMENSION LOCK // SIGNAL ACQUIRED";
  overlay.appendChild(signal);

  document.body.appendChild(overlay);
  document.body.classList.add("wormhole-active");

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    window.location.assign(href);
    return;
  }

  const maxR = Math.hypot(window.innerWidth, window.innerHeight);
  const streaks: Streak[] = Array.from({ length: 96 }, (_, i) => ({
    angle: (i / 96) * Math.PI * 2 + Math.random() * 0.08,
    dist: 30 + Math.random() * maxR * 0.9,
    speed: 0.4 + Math.random() * 1.2,
    width: 0.8 + Math.random() * 2.2,
    hue: 180 + Math.random() * 100,
  }));

  const staticCanvas = document.createElement("canvas");
  staticCanvas.width = 256;
  staticCanvas.height = 144;
  const staticCtx = staticCanvas.getContext("2d");

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const start = performance.now();

  const drawStatic = (intensity: number) => {
    if (!staticCtx || intensity < 0.05) return;
    const img = staticCtx.createImageData(staticCanvas.width, staticCanvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255 * intensity;
      d[i] = v;
      d[i + 1] = v * 0.92;
      d[i + 2] = v * 1.08;
      d[i + 3] = 28 + Math.random() * 55 * intensity;
    }
    staticCtx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.35 + intensity * 0.45;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(staticCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const drawScanlines = (alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let y = 0; y < canvas.height; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.restore();
  };

  const drawTunnel = (cx: number, cy: number, t: number) => {
    const suck = easeInQuart(t);
    const ringCount = 36;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * Math.PI * 1.6);
    for (let i = ringCount; i >= 0; i--) {
      const phase = i / ringCount;
      const r = (phase * maxR * 0.72 + 8) * (1 - suck * 0.92);
      if (r < 2) continue;
      const alpha = (1 - phase) * (1 - suck * 0.35) * 0.55;
      const hue = 200 + phase * 80 + t * 40;
      ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${alpha})`;
      ctx.lineWidth = 1 + (1 - phase) * 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.08, r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawStreaks = (cx: number, cy: number, t: number) => {
    const suck = easeInQuart(t);
    ctx.save();
    ctx.translate(cx, cy);
    for (const s of streaks) {
      s.dist -= s.speed * (4 + suck * 28) * 0.016;
      if (s.dist < 4) {
        s.dist = maxR * (0.35 + Math.random() * 0.65);
        s.angle += (Math.random() - 0.5) * 0.2;
      }
      const len = 24 + (1 - suck) * 120 + s.width * 18;
      const x0 = Math.cos(s.angle) * s.dist;
      const y0 = Math.sin(s.angle) * s.dist;
      const x1 = Math.cos(s.angle) * (s.dist - len * (1 + suck * 2));
      const y1 = Math.sin(s.angle) * (s.dist - len * (1 + suck * 2));
      const alpha = (1 - suck) * 0.75;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `hsla(${s.hue}, 100%, 78%, 0)`);
      grad.addColorStop(0.35, `hsla(${s.hue}, 95%, 70%, ${alpha})`);
      grad.addColorStop(1, `hsla(${s.hue + 40}, 100%, 92%, ${alpha * 0.9})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawHorizon = (cx: number, cy: number, t: number) => {
    const suck = easeInQuart(t);
    const r = 6 + suck * maxR * 0.48;
    const disk = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r);
    disk.addColorStop(0, "rgba(0, 0, 0, 1)");
    disk.addColorStop(0.22, "rgba(12, 4, 32, 0.98)");
    disk.addColorStop(0.48, `rgba(90, 40, 180, ${0.75 - suck * 0.2})`);
    disk.addColorStop(0.62, `rgba(255, 180, 80, ${0.55 * (1 - suck * 0.4)})`);
    disk.addColorStop(0.78, `rgba(120, 220, 255, ${0.35 * (1 - suck)})`);
    disk.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawVhsBand = (t: number) => {
    const y = ((t * 1.8) % 1) * (canvas.height + 120) - 60;
    const band = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.45, "rgba(255,255,255,0.08)");
    band.addColorStop(0.5, "rgba(255,255,255,0.22)");
    band.addColorStop(0.55, "rgba(255,255,255,0.08)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 40, canvas.width, 80);
  };

  const frame = (now: number) => {
    const raw = Math.min(1, (now - start) / WORMHOLE_MS);
    const t = easeInOutCubic(raw);

    const cx = originX;
    const cy = originY;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + t * 0.55})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawTunnel(cx, cy, t);
    drawStreaks(cx, cy, t);
    drawHorizon(cx, cy, t);
    drawVhsBand(t);
    drawScanlines(0.12 + t * 0.18);
    drawStatic(0.15 + t * 0.65);

    if (t > 0.35) {
      const chroma = (t - 0.35) / 0.65;
      const offset = chroma * 6;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = chroma * 0.22;
      ctx.fillStyle = "rgba(255, 60, 120, 0.35)";
      ctx.fillRect(offset, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(60, 200, 255, 0.35)";
      ctx.fillRect(-offset, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (t > 0.62) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(t - 0.62) / 0.38})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    signal.style.opacity = String(Math.max(0, 1 - t * 1.4));
    signal.style.transform = `translate(-50%, -50%) scale(${1 + t * 0.08})`;

    if (raw < 1) {
      requestAnimationFrame(frame);
    } else {
      window.removeEventListener("resize", resize);
      sessionStorage.setItem("wormhole-arrival", "1");
      window.location.assign(href);
    }
  };

  requestAnimationFrame(frame);
}

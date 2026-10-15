const TAU = Math.PI * 2;
const TURNS = 2.2;
const RADIUS = 0.4;
const CAMERA = 3.4;
const BUCKETS = 14;

export type HelixPort = { x: number; y: number; anchor: number; alpha: number };

export type HelixFrame = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  scale: number;
  spin: number;
  tiltX: number;
  tiltZ: number;
  split: number;
  splitPx: number;
  network: number;
  time: number;
  ports: HelixPort[];
  dark: boolean;
};

type StrandDot = { k: number; t: number; dr: number; da: number; dy: number; size: number; hot: boolean };
type RungDot = { t: number; f: number; dy: number; size: number };
type Neuron = { x: number; y: number; z: number; size: number; hub: boolean };
type Mote = { x: number; y: number; z: number; vx: number; vy: number; size: number; phase: number };
type Synapse = { edge: number; t: number; speed: number };

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(TAU * rand());
}

function hex(value: string) {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ramp(stops: string[], t: number) {
  const scaled = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(scaled);
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  const f = scaled - i;
  return a.map((v, index) => Math.round(v + (b[index] - v) * f));
}

/** Top of the helix is indigo, the base settles into teal, matching the brand gradient. */
const LIGHT_STOPS = ["#6a7cf0", "#4263eb", "#2f6fe4", "#1f8fd0", "#0f9fad"];
const DARK_STOPS = ["#9aa9ff", "#6d84f2", "#4f8dff", "#3fb5e8", "#3ec4d0"];

function sprite(rgb: number[], hot: boolean, dark: boolean) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const [r, gr, b] = rgb;
  if (hot) {
    g.addColorStop(0, dark ? "rgba(255,255,255,1)" : `rgba(${r},${gr},${b},1)`);
    g.addColorStop(0.16, dark ? `rgba(230,240,255,0.95)` : `rgba(${Math.round(r * 0.8)},${Math.round(gr * 0.8)},${Math.round(b * 0.9)},1)`);
    g.addColorStop(0.3, `rgba(${r},${gr},${b},0.55)`);
    g.addColorStop(0.62, `rgba(${r},${gr},${b},0.12)`);
  } else {
    g.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    g.addColorStop(0.2, `rgba(${r},${gr},${b},0.92)`);
    g.addColorStop(0.34, `rgba(${r},${gr},${b},0.32)`);
    g.addColorStop(0.62, `rgba(${r},${gr},${b},0.06)`);
  }
  g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

type Palette = { base: HTMLCanvasElement[]; hot: HTMLCanvasElement[]; rgb: number[][] };

function palette(dark: boolean): Palette {
  const stops = dark ? DARK_STOPS : LIGHT_STOPS;
  const rgb = Array.from({ length: BUCKETS }, (_, i) => ramp(stops, i / (BUCKETS - 1)));
  return {
    rgb,
    base: rgb.map((c) => sprite(c, false, dark)),
    hot: rgb.map((c) => sprite(c, true, dark)),
  };
}

function bucket(y: number) {
  return Math.max(0, Math.min(BUCKETS - 1, Math.round(((y + 1) / 2) * (BUCKETS - 1))));
}

/**
 * Particle double helix wrapped in a neural graph. Draws the far half (and the graph) on `back`
 * and the near half on `front`, so DOM cards placed between the two canvases sit inside the scene.
 */
export function createHelixField(back: HTMLCanvasElement, front: HTMLCanvasElement, dense: boolean) {
  const rand = seeded(38);
  const strand: StrandDot[] = [];
  const perStrand = dense ? 820 : 460;
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < perStrand; i++) {
      strand.push({
        k,
        t: rand(),
        dr: gaussian(rand) * 0.032,
        da: gaussian(rand) * 0.055,
        dy: gaussian(rand) * 0.016,
        size: 0.65 + Math.pow(rand(), 3) * 2.3,
        hot: rand() < 0.12,
      });
    }
    const line = dense ? 260 : 170;
    for (let i = 0; i <= line; i++) {
      strand.push({ k, t: i / line, dr: 0, da: 0, dy: 0, size: 1.35, hot: i % 7 === 0 });
    }
  }

  const rungs: RungDot[] = [];
  const rungCount = Math.round(TURNS * 11);
  for (let j = 0; j < rungCount; j++) {
    const t = (j + 0.5) / rungCount;
    for (let d = 1; d < 12; d++) rungs.push({ t, f: d / 12, dy: gaussian(rand) * 0.004, size: d === 6 ? 1.5 : 0.8 + rand() * 0.4 });
  }

  const neurons: Neuron[] = [];
  while (neurons.length < (dense ? 78 : 56)) {
    const x = (rand() * 2 - 1) * 1.02;
    const y = -1.08 + 2.16 * Math.pow(rand(), 1.35);
    const z = (rand() * 2 - 1) * 0.62;
    const r = Math.hypot(x, z);
    const reach = 1.02 - 0.28 * Math.max(0, y);
    if (r < RADIUS + 0.1 || Math.hypot(x / reach, z / 0.62) > 1) continue;
    neurons.push({ x, y, z, size: 1.1 + rand() * 1.6, hub: rand() < 0.14 });
  }

  const edges: [number, number][] = [];
  const seen = new Set<string>();
  neurons.forEach((a, i) => {
    const near = neurons
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) }))
      .filter((item) => item.j !== i && item.d < 0.46)
      .sort((p, q) => p.d - q.d)
      .slice(0, a.hub ? 4 : 2);
    near.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([i, j]);
    });
  });
  const roots = neurons.map((n, i) => ({ i, r: Math.hypot(n.x, n.z) })).filter((n) => n.r < 0.62).map((n) => n.i);

  const motes: Mote[] = Array.from({ length: dense ? 150 : 90 }, () => ({
    x: (rand() * 2 - 1) * 1.1,
    y: (rand() * 2 - 1) * 1.1,
    z: (rand() * 2 - 1) * 0.7,
    vx: (rand() - 0.6) * 0.025,
    vy: -0.012 - rand() * 0.03,
    size: 0.4 + rand() * 1.1,
    phase: rand() * TAU,
  }));

  const synapses: Synapse[] = Array.from({ length: Math.min(14, edges.length) }, (_, i) => ({
    edge: Math.floor(rand() * edges.length),
    t: i / 14,
    speed: 0.35 + rand() * 0.5,
  }));

  const total = strand.length + rungs.length;
  const px = new Float32Array(total);
  const py = new Float32Array(total);
  const pz = new Float32Array(total);
  const pd = new Float32Array(total);
  const pa = new Float32Array(total);
  const pc = new Uint8Array(total);
  const ph = new Uint8Array(total);
  const order = Array.from({ length: total }, (_, i) => i);
  const nx = new Float32Array(neurons.length);
  const ny = new Float32Array(neurons.length);
  const nz = new Float32Array(neurons.length);

  const bctx = back.getContext("2d")!;
  const fctx = front.getContext("2d")!;
  let paints: { dark: boolean; set: Palette } | null = null;
  let last = 0;

  function draw(frame: HelixFrame) {
    if (!paints || paints.dark !== frame.dark) paints = { dark: frame.dark, set: palette(frame.dark) };
    const { base, hot, rgb } = paints.set;
    const { cx, cy, scale, split, splitPx, time, dark } = frame;
    const dt = last ? Math.min(0.05, time - last) : 0;
    last = time;

    const cX = Math.cos(frame.tiltX);
    const sX = Math.sin(frame.tiltX);
    const cZ = Math.cos(frame.tiltZ);
    const sZ = Math.sin(frame.tiltZ);
    const radiusK = 1 - 0.86 * split;
    const sizeK = Math.max(0.7, Math.min(1.6, scale / 190));

    const project = (x: number, y: number, z: number, out: number[]) => {
      const y2 = y * cX - z * sX;
      const z2 = y * sX + z * cX;
      const f = CAMERA / (CAMERA - z2);
      const sx = x * f * scale;
      const sy = y2 * f * scale;
      out[0] = cx + sx * cZ - sy * sZ;
      out[1] = cy + sx * sZ + sy * cZ;
      out[2] = z2;
      out[3] = f;
    };
    const tmp = [0, 0, 0, 0];

    const strandPoint = (k: number, t: number, dr: number, da: number, dy: number, out: number[]) => {
      const a = t * TURNS * TAU + k * Math.PI + frame.spin + da;
      const r = (RADIUS + dr) * radiusK;
      project(Math.cos(a) * r, (t - 0.5) * 2 + dy, Math.sin(a) * r, out);
      const wave = split > 0 ? Math.sin(t * 11 + time * 0.9 + k * 2) * 5 * split : 0;
      out[0] += (k ? 1 : -1) * splitPx * split + wave;
    };

    let n = 0;
    for (const dot of strand) {
      strandPoint(dot.k, dot.t, dot.dr, dot.da, dot.dy, tmp);
      const depth = tmp[2] / (RADIUS + 0.06);
      px[n] = tmp[0];
      py[n] = tmp[1];
      pz[n] = tmp[2];
      pd[n] = dot.size * tmp[3] * sizeK * 4.8;
      pa[n] = 0.34 + 0.66 * Math.max(0, Math.min(1, (depth + 1) / 2));
      pc[n] = bucket((dot.t - 0.5) * 2);
      ph[n] = dot.hot && depth > 0.15 ? 1 : 0;
      n++;
    }
    const a0 = [0, 0, 0, 0];
    const b0 = [0, 0, 0, 0];
    const rungAlpha = Math.max(0, 1 - split * 1.6);
    for (const dot of rungs) {
      strandPoint(0, dot.t, 0, 0, 0, a0);
      strandPoint(1, dot.t, 0, 0, 0, b0);
      const z = a0[2] + (b0[2] - a0[2]) * dot.f;
      px[n] = a0[0] + (b0[0] - a0[0]) * dot.f;
      py[n] = a0[1] + (b0[1] - a0[1]) * dot.f + dot.dy * scale;
      pz[n] = z;
      pd[n] = dot.size * sizeK * 4.6;
      pa[n] = rungAlpha * (0.3 + 0.5 * Math.max(0, Math.min(1, (z / RADIUS + 1) / 2)));
      pc[n] = Math.min(BUCKETS - 1, bucket((dot.t - 0.5) * 2) + (dot.f > 0.5 ? 2 : 0));
      ph[n] = dot.size > 1.2 ? 1 : 0;
      n++;
    }

    order.sort((i, j) => pz[i] - pz[j]);

    for (const ctx of [bctx, fctx]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const ratio = ctx.canvas.width / Math.max(1, frame.width);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    }

    const spinY = frame.spin * 0.55;
    const cY = Math.cos(spinY);
    const sY = Math.sin(spinY);
    const push = 1 + split * 1.3;
    neurons.forEach((nr, i) => {
      const x = (nr.x * cY - nr.z * sY) * push;
      const z = nr.x * sY + nr.z * cY;
      project(x, nr.y, z, tmp);
      nx[i] = tmp[0];
      ny[i] = tmp[1];
      nz[i] = tmp[2];
    });

    const net = frame.network * (1 - split);
    if (net > 0.01) {
      const [er, eg, eb] = dark ? [142, 160, 246] : [66, 99, 235];
      bctx.lineWidth = 0.8;
      for (const [i, j] of edges) {
        const depth = (nz[i] + nz[j]) / 2;
        bctx.strokeStyle = `rgba(${er},${eg},${eb},${(dark ? 0.2 : 0.16) * net * (0.55 + depth)})`;
        bctx.beginPath();
        bctx.moveTo(nx[i], ny[i]);
        bctx.lineTo(nx[j], ny[j]);
        bctx.stroke();
      }
      bctx.setLineDash([2, 4]);
      for (const i of roots) {
        const y = neurons[i].y;
        project(0, y, 0, tmp);
        bctx.strokeStyle = `rgba(${er},${eg},${eb},${(dark ? 0.16 : 0.12) * net})`;
        bctx.beginPath();
        bctx.moveTo(nx[i], ny[i]);
        bctx.lineTo(tmp[0], tmp[1]);
        bctx.stroke();
      }
      bctx.setLineDash([]);
      neurons.forEach((nr, i) => {
        const d = nr.size * sizeK * (nr.hub ? 6.5 : 4.4);
        bctx.globalAlpha = net * (0.45 + 0.4 * Math.max(0, nz[i] + 0.4));
        bctx.drawImage(nr.hub ? hot[bucket(nr.y)] : base[bucket(nr.y)], nx[i] - d / 2, ny[i] - d / 2, d, d);
        if (nr.hub) {
          const [r, g, b] = rgb[bucket(nr.y)];
          bctx.globalAlpha = net * 0.5;
          bctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
          bctx.lineWidth = 0.8;
          bctx.beginPath();
          bctx.arc(nx[i], ny[i], d * 0.55 + Math.sin(time * 2 + i) * 1.2, 0, TAU);
          bctx.stroke();
        }
      });
      for (const s of synapses) {
        s.t += dt * s.speed;
        if (s.t >= 1) {
          s.t = 0;
          s.edge = (s.edge * 7 + 13) % edges.length;
        }
        const [i, j] = edges[s.edge];
        const x = nx[i] + (nx[j] - nx[i]) * s.t;
        const y = ny[i] + (ny[j] - ny[i]) * s.t;
        const d = 7 * sizeK;
        bctx.globalAlpha = net * Math.sin(s.t * Math.PI);
        bctx.drawImage(hot[bucket(neurons[i].y)], x - d / 2, y - d / 2, d, d);
      }
    }

    for (const m of motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y < -1.25 || Math.abs(m.x) > 1.3) {
        m.y = 1.1;
        m.x = (Math.sin(m.phase * 13.1 + time) * 0.5 + 0.5) * 1.6 - 0.8;
      }
      project(m.x * (1 + split), m.y, m.z, tmp);
      const d = m.size * sizeK * 4;
      bctx.globalAlpha = (0.25 + 0.35 * Math.sin(time * 1.3 + m.phase) ** 2) * (1 - split * 0.6);
      bctx.drawImage(base[bucket(m.y)], tmp[0] - d / 2, tmp[1] - d / 2, d, d);
    }

    const connect = (port: HelixPort, index: number) => {
      if (port.alpha < 0.01) return;
      project(0, port.anchor, 0, tmp);
      const x0 = tmp[0];
      const y0 = tmp[1];
      const dx = port.x - x0;
      const c1x = x0 + dx * 0.42;
      const c2x = port.x - dx * 0.38;
      const [r0, g0, b0] = rgb[bucket(port.anchor)];
      const grad = bctx.createLinearGradient(x0, y0, port.x, port.y);
      grad.addColorStop(0, `rgba(${r0},${g0},${b0},0)`);
      grad.addColorStop(0.3, `rgba(${r0},${g0},${b0},${0.6 * port.alpha})`);
      grad.addColorStop(1, `rgba(${r0},${g0},${b0},${0.95 * port.alpha})`);
      bctx.globalAlpha = 1;
      bctx.strokeStyle = grad;
      bctx.lineWidth = 1.6;
      bctx.beginPath();
      bctx.moveTo(x0, y0);
      bctx.bezierCurveTo(c1x, y0, c2x, port.y, port.x, port.y);
      bctx.stroke();
      for (let p = 0; p < 2; p++) {
        const t = (time * 0.32 + index * 0.37 + p * 0.5) % 1;
        const u = 1 - t;
        const x = u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * port.x;
        const y = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * port.y + t * t * t * port.y;
        const d = 9 * sizeK;
        bctx.globalAlpha = port.alpha * Math.sin(t * Math.PI);
        bctx.drawImage(hot[bucket(port.anchor)], x - d / 2, y - d / 2, d, d);
      }
    };
    frame.ports.forEach(connect);

    for (const i of order) {
      const ctx = pz[i] > 0.02 ? fctx : bctx;
      const d = pd[i];
      ctx.globalAlpha = pa[i];
      ctx.drawImage(ph[i] ? hot[pc[i]] : base[pc[i]], px[i] - d / 2, py[i] - d / 2, d, d);
    }
    bctx.globalAlpha = 1;
    fctx.globalAlpha = 1;
  }

  return { draw };
}

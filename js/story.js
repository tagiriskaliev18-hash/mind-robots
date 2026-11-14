// Act I — Build-Story Scroll Cinema Engine (adapted from build-story-scroll-site/starter/main.js).
// Zero CDN: uses vendored GSAP + ScrollTrigger (window.gsap / window.ScrollTrigger) and local Lenis ESM.
import Lenis from "./vendor/lenis.mjs";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

export const STORY = {
  source: "frames",
  scrollLength: 6.8,
  smoothing: { wheel: 11, touch: 8.5 },
  maxFramesPerSecond: 260,
  blend: true,
  focus: { desktop: [0.50, 0.50], mobile: [0.50, 0.45] },
  sets: {
    desktop: { dir: "assets/frames/desktop/", count: 320, ext: "webp", pad: 4, w: 1280, h: 720 },
    mobile:  { dir: "assets/frames/mobile/",  count: 220, ext: "webp", pad: 4, w: 540,  h: 960 }
  },
  video: { desktop: "assets/film-desktop.mp4", mobile: "assets/film-mobile.mp4", fps: 30 },
  // Continuous 3D timeline mapping: scroll progress [0..1] -> rendered 3D assembly film [0..1]
  // 1 wires (0-.115) -> 2 legs/frame (.115-.275) -> 3 arms (.275-.445) -> 4 head/bus (.445-.60) -> 5 hero (.60-.715) -> 6 visor bore (.715-.875) -> 7 core (.875-1.0)
  timeKeys: [
    [0.00, 0.000],
    [0.13, 0.115],
    [0.26, 0.275],
    [0.39, 0.445],
    [0.52, 0.600],
    [0.66, 0.715],
    [0.80, 0.875],
    [0.93, 0.992],
    [1.00, 1.000]
  ],
  stages: [
    {
      from: 0.00, to: 0.13,
      kicker: "ЭТАП 01 / 07",
      caps: "Чистый", serif: "замысел",
      sub: "Световой CAD-чертёж в масштабе 1,32 м обретает опору на титановых стопах и тазовом узле.",
      hint: "Собрать каркас"
    },
    {
      from: 0.13, to: 0.26,
      kicker: "ЭТАП 02 / 07",
      caps: "Несущий", serif: "скелет",
      sub: "Фрезерованный алюминий и карбон замыкают силовую раму без единого гидравлического контура.",
      hint: "Встроить приводы"
    },
    {
      from: 0.26, to: 0.39,
      kicker: "ЭТАП 03 / 07",
      caps: "Сила", serif: "в суставах",
      sub: "Синхронные электромоторы PMSM и батарея 9000 мА·ч встают в открытые узлы шасси.",
      hint: "Протянуть нервы"
    },
    {
      from: 0.39, to: 0.52,
      kicker: "ЭТАП 04 / 07",
      caps: "Нервная", serif: "сеть",
      sub: "Оптоволоконные шины связывают 43 оси движения с центральным контроллером равновесия.",
      hint: "Замкнуть облик"
    },
    {
      from: 0.52, to: 0.66,
      kicker: "ЭТАП 05 / 07",
      caps: "Облик", serif: "в сборе",
      sub: "Матовый защитный кожух и тёмный визор закрывают корпус массой 35 кг — робот готов к шагу.",
      hint: "Сквозь визор"
    },
    {
      from: 0.66, to: 0.80,
      kicker: "АКТ I · ОПТИКА",
      caps: "Сквозь", serif: "оптику",
      sub: "Камера проходит за стекло визора к стереопаре глубины и твердотельному 3D-лидару.",
      hint: "Войти в ядро"
    },
    {
      from: 0.80, to: 0.93,
      kicker: "АКТ I · ЯДРО",
      caps: "Разум", serif: "в движении",
      sub: "Вычислительный модуль объединяет зрение и моторику в единую петлю частотой 1 кГц.",
      hint: ""
    }
  ],
  finale: { from: 0.93, to: 0.985 },
  callouts: [
    {
      label: "CAD · 1,32 м",
      show: [0.015, 0.12],
      keys: {
        desktop: [[0, 0.48, 0.20], [38, 0.49, 0.24], [319, 0.49, 0.24]],
        mobile:  [[0, 0.54, 0.20], [24, 0.54, 0.22], [219, 0.54, 0.22]]
      }
    },
    {
      label: "Рама Al-7075",
      show: [0.15, 0.245],
      keys: {
        desktop: [[38, 0.51, 0.46], [85, 0.50, 0.46], [319, 0.50, 0.46]],
        mobile:  [[24, 0.51, 0.38], [57, 0.50, 0.36], [219, 0.50, 0.36]]
      }
    },
    {
      label: "PMSM · 120 Н·м",
      show: [0.28, 0.375],
      keys: {
        desktop: [[88, 0.38, 0.44], [137, 0.37, 0.41], [319, 0.37, 0.41]],
        mobile:  [[59, 0.28, 0.43], [96, 0.27, 0.40], [219, 0.27, 0.40]]
      }
    },
    {
      label: "Шина 1 кГц",
      show: [0.41, 0.505],
      keys: {
        desktop: [[140, 0.49, 0.44], [186, 0.50, 0.45], [319, 0.50, 0.45]],
        mobile:  [[98, 0.50, 0.34], [128, 0.50, 0.35], [219, 0.50, 0.35]]
      }
    },
    {
      label: "3D-лидар 360°",
      show: [0.68, 0.785],
      keys: {
        desktop: [[229, 0.50, 0.40], [275, 0.50, 0.48], [319, 0.50, 0.48]],
        mobile:  [[158, 0.50, 0.36], [190, 0.50, 0.47], [219, 0.50, 0.47]]
      }
    }
  ],
  fx: { enabled: true, count: { desktop: 28, mobile: 0 }, color: [0, 245, 255], speed: 2.5 }
};

window.__STORY_STAGES = STORY.stages;

const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const storyEl = $("#story");
const stageEl = $("#storyStage");
const mediaEl = $("#media");
const canvas = $("#film");
const poster = $("#poster");
const videoEl = $("#filmVideo");
const fxCanvas = $("#fx");
const fx = fxCanvas.getContext("2d");

/* ---------- GPU WebGL2 Textured Quad Renderer (0.2ms draw, 2D fallback) ---------- */
function createFilmRenderer(cvs) {
  const gl = cvs.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false
  });
  if (!gl) {
    const ctx2d = cvs.getContext("2d", { alpha: false });
    return {
      isGL: false,
      setSmoothing() {
        ctx2d.imageSmoothingEnabled = true;
        ctx2d.imageSmoothingQuality = "medium";
      },
      draw(entryA, entryB, mix, vw) {
        const d = vw.dpr;
        ctx2d.globalAlpha = 1;
        ctx2d.drawImage(entryA.src, vw.dx * d, vw.dy * d, vw.dw * d, vw.dh * d);
        if (entryB && mix > 0.02) {
          ctx2d.globalAlpha = mix;
          ctx2d.drawImage(entryB.src, vw.dx * d, vw.dy * d, vw.dw * d, vw.dh * d);
        }
        ctx2d.globalAlpha = 1;
      }
    };
  }

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_texA;
    uniform sampler2D u_texB;
    uniform float u_mix;
    uniform float u_zoom;
    uniform vec2 u_scale;
    uniform vec2 u_offset;
    out vec4 outColor;
    void main() {
      vec2 zuv = (v_uv - 0.5) / max(0.85, u_zoom) + 0.5;
      vec2 tuv = zuv * u_scale + u_offset;
      vec4 col = texture(u_texA, tuv);
      if (u_mix > 0.01) {
        col = mix(col, texture(u_texB, tuv), u_mix);
      }
      vec2 d = v_uv - 0.5;
      float vig = 1.0 - smoothstep(0.42, 0.92, dot(d, d) * 1.45) * 0.34;
      outColor = vec4(col.rgb * vig, 1.0);
    }
  `));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const mkTex = (unit) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    return t;
  };
  const texA = mkTex(0);
  const texB = mkTex(1);
  gl.uniform1i(gl.getUniformLocation(prog, "u_texA"), 0);
  gl.uniform1i(gl.getUniformLocation(prog, "u_texB"), 1);
  const uMix = gl.getUniformLocation(prog, "u_mix");
  const uZoom = gl.getUniformLocation(prog, "u_zoom");
  const uScale = gl.getUniformLocation(prog, "u_scale");
  const uOffset = gl.getUniformLocation(prog, "u_offset");

  let idA = -1, genA = -1;
  let idB = -1, genB = -1;
  let wA = 0, hA = 0, wB = 0, hB = 0;

  return {
    isGL: true,
    setSmoothing() {},
    draw(entryA, entryB, mix, vw, zoom = 1) {
      gl.viewport(0, 0, cvs.width, cvs.height);
      const sx = vw.cw / (vw.dw || 1);
      const sy = vw.ch / (vw.dh || 1);
      const ox = -vw.dx / (vw.dw || 1);
      const oy = -vw.dy / (vw.dh || 1);
      gl.uniform2f(uScale, sx, sy);
      gl.uniform2f(uOffset, ox, oy);
      gl.uniform1f(uZoom, zoom);
      if (entryA.id !== idA || entryA.gen !== genA) {
        const s = entryA.src;
        const sw = s.width || s.videoWidth || 0;
        const sh = s.height || s.videoHeight || 0;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texA);
        if (sw && sw === wA && sh === hA) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, s);
        } else {
          wA = sw; hA = sh;
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s);
        }
        idA = entryA.id;
        genA = entryA.gen;
      }
      if (entryB && mix > 0.015) {
        if (entryB.id !== idB || entryB.gen !== genB) {
          const s = entryB.src;
          const sw = s.width || s.videoWidth || 0;
          const sh = s.height || s.videoHeight || 0;
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, texB);
          if (sw && sw === wB && sh === hB) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, s);
          } else {
            wB = sw; hB = sh;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s);
          }
          idB = entryB.id;
          genB = entryB.gen;
        }
        gl.uniform1f(uMix, mix);
      } else {
        gl.uniform1f(uMix, 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}
const filmRenderer = createFilmRenderer(canvas);

const reduced = root.classList.contains("is-still") || matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const portrait = matchMedia("(max-aspect-ratio: 1/1)").matches;
const setName = portrait ? "mobile" : "desktop";
const SET = STORY.sets[setName];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const frameURL = (i) => `${SET.dir}${String(i + 1).padStart(SET.pad, "0")}.${SET.ext}`;

function mapKeys(p, keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, t1] = keys[i];
    if (p <= p1) {
      const [p0, t0] = keys[i - 1];
      return t0 + (t1 - t0) * ((p - p0) / (p1 - p0 || 1));
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------- Progressive coarse->fine frame preloader ---------- */
/* ---------- Bounded Compressed Blob Store + Off-Main-Thread ImageBitmap LRU ---------- */
const MAX_DECODED = portrait ? 105 : 180;
const MAX_DECODE_CONC = portrait ? 2 : 3;
let canImageBitmap = typeof createImageBitmap === "function";
let canBitmapResize = portrait && canImageBitmap;
let decodeSeq = 0;
let lastPrefetchCenter = 0;
let lastPrefetchDir = 1;
let activeDecodes = 0;
const decodeQueue = new Set();

const store = {
  blobs: new Array(SET.count),
  ok: new Uint8Array(SET.count),
  loaded: 0,
  lru: new Map(),      // frameIndex -> { id, gen, src: ImageBitmap | HTMLImageElement, isBmp }
  decoding: new Set(),
  nearestDecoded(i) {
    if (this.lru.has(i)) return i;
    for (let d = 1; d < SET.count; d++) {
      if (i - d >= 0 && this.lru.has(i - d)) return i - d;
      if (i + d < SET.count && this.lru.has(i + d)) return i + d;
    }
    return -1;
  },
  nearestBelow(i, maxDist = 18) {
    for (let d = 0; d <= maxDist; d++) {
      const k = i - d;
      if (k >= 0 && this.lru.has(k)) return k;
    }
    return -1;
  },
  nearestAbove(i, maxDist = 18) {
    for (let d = 0; d <= maxDist; d++) {
      const k = i + d;
      if (k < SET.count && this.lru.has(k)) return k;
    }
    return -1;
  }
};

function putLru(i, entry) {
  if (store.lru.has(i)) {
    const prev = store.lru.get(i);
    if (prev.isBmp) try { prev.src.close(); } catch {}
    store.lru.delete(i);
  }
  store.lru.set(i, entry);
  while (store.lru.size > MAX_DECODED) {
    let worstKey = -1;
    let worstDist = -1;
    for (const k of store.lru.keys()) {
      if (k === i) continue;
      const d = Math.abs(k - lastPrefetchCenter);
      if (d > worstDist) { worstDist = d; worstKey = k; }
    }
    if (worstKey < 0) break;
    const old = store.lru.get(worstKey);
    store.lru.delete(worstKey);
    if (old?.isBmp) try { old.src.close(); } catch {}
  }
}

async function decodeToLru(i) {
  const blob = store.blobs[i];
  if (!blob || store.lru.has(i) || store.decoding.has(i)) return;
  store.decoding.add(i);
  try {
    if (canImageBitmap) {
      try {
        let bmp;
        if (canBitmapResize && view.cw > 0) {
          const targetW = Math.min(SET.w, Math.max(384, Math.round(view.cw * view.dpr)));
          const targetH = Math.round((targetW * SET.h) / SET.w);
          if (targetW < SET.w - 32) {
            try {
              bmp = await createImageBitmap(blob, { resizeWidth: targetW, resizeHeight: targetH, resizeQuality: "medium" });
            } catch {
              canBitmapResize = false;
              bmp = await createImageBitmap(blob);
            }
          } else {
            bmp = await createImageBitmap(blob);
          }
        } else {
          bmp = await createImageBitmap(blob);
        }
        putLru(i, { id: i, gen: ++decodeSeq, src: bmp, isBmp: true });
        dirty = true;
        return;
      } catch {
        canImageBitmap = false;
      }
    }
    await new Promise((resolve) => {
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        putLru(i, { id: i, gen: ++decodeSeq, src: img, isBmp: false });
        dirty = true;
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(); };
      img.src = objUrl;
    });
  } finally {
    store.decoding.delete(i);
  }
}

function pumpDecodeQueue() {
  while (activeDecodes < MAX_DECODE_CONC && decodeQueue.size > 0) {
    let best = -1;
    let bestScore = Infinity;
    for (const idx of decodeQueue) {
      if (store.lru.has(idx) || store.decoding.has(idx) || !store.blobs[idx]) {
        decodeQueue.delete(idx);
        continue;
      }
      const delta = idx - lastPrefetchCenter;
      const dirPenalty = (lastPrefetchDir >= 0 ? delta < 0 : delta > 0) ? 1.35 : 1.0;
      const score = Math.abs(delta) * dirPenalty;
      if (score < bestScore) { bestScore = score; best = idx; }
    }
    if (best < 0) break;
    decodeQueue.delete(best);
    activeDecodes++;
    decodeToLru(best).finally(() => {
      activeDecodes--;
      pumpDecodeQueue();
    });
  }
}

function requestDecode(i) {
  if (i < 0 || i >= SET.count || !store.blobs[i] || store.lru.has(i) || store.decoding.has(i)) return;
  decodeQueue.add(i);
  pumpDecodeQueue();
}

function prefetchWindow(center, dir = 1) {
  lastPrefetchCenter = center;
  lastPrefetchDir = dir;
  // Prune stale far-away queued items so scrolling rapidly always decodes immediate targets first
  if (decodeQueue.size > 28) {
    for (const q of decodeQueue) {
      if (Math.abs(q - center) > 36) decodeQueue.delete(q);
    }
  }
  const ahead = dir >= 0 ? 18 : 6;
  const behind = dir >= 0 ? 6 : 18;
  const step = dir >= 0 ? 1 : -1;
  for (let d = 0; d <= ahead; d++) {
    const idx = center + d * step;
    if (idx >= 0 && idx < SET.count && store.blobs[idx] && !store.lru.has(idx)) {
      decodeQueue.add(idx);
    }
  }
  for (let d = 1; d <= behind; d++) {
    const idx = center - d * step;
    if (idx >= 0 && idx < SET.count && store.blobs[idx] && !store.lru.has(idx)) {
      decodeQueue.add(idx);
    }
  }
  pumpDecodeQueue();
}

async function loadFrame(i, attempt = 0) {
  if (store.ok[i]) return true;
  try {
    const res = await fetch(frameURL(i));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    store.blobs[i] = blob;
    store.ok[i] = 1;
    store.loaded++;
    return true;
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
      return loadFrame(i, attempt + 1);
    }
    console.warn("story frame missing", i);
    return false;
  }
}

function preloadOrder() {
  const seen = new Uint8Array(SET.count);
  const passes = [];
  for (const step of [16, 8, 4, 2, 1]) {
    const pass = [];
    for (let i = 0; i < SET.count; i += step) {
      if (!seen[i]) {
        seen[i] = 1;
        pass.push(i);
      }
    }
    if (step === 16 && !seen[SET.count - 1]) {
      seen[SET.count - 1] = 1;
      pass.push(SET.count - 1);
    }
    passes.push(pass);
  }
  return passes;
}

async function runPool(list, concurrency, onEach) {
  let k = 0;
  const worker = async () => {
    while (k < list.length) {
      const i = list[k++];
      await loadFrame(i);
      if (onEach) onEach(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
}

let dirty = true;
async function preloadFrames(onProgress) {
  const passes = preloadOrder();
  const gate = passes[0].concat(passes[1]);
  let n = 0;
  await runPool(gate, 6, async (i) => {
    await decodeToLru(i);
    onProgress(++n / gate.length);
  });
  // Загружаем все WebP-блоки в память и прогреваем начало + опорные кадры pass[2] без блокировки скролла
  (async () => {
    await runPool(Array.from({ length: Math.min(28, SET.count) }, (_, k) => k), 6, (i) => {
      if (i < 24) requestDecode(i);
    });
    for (let idx = 2; idx < passes.length; idx++) {
      const pass = passes[idx];
      await runPool(pass, 8, idx === 2 ? (i) => { requestDecode(i); } : undefined);
    }
    dirty = true;
  })();
}

/* ---------- Canvas sizing & cover-fit ---------- */
const view = { cw: 0, ch: 0, dpr: 1, dx: 0, dy: 0, dw: 0, dh: 0, mx: 0, my: 0, sw: 0, sh: 0 };
function resize() {
  const r = mediaEl.getBoundingClientRect();
  const s = stageEl.getBoundingClientRect();
  const capDpr = setName === "mobile" ? 1.15 : 1.25;
  view.dpr = Math.min(window.devicePixelRatio || 1, capDpr);
  view.cw = r.width;
  view.ch = r.height;
  view.sw = s.width;
  view.sh = s.height;
  view.mx = mediaEl.offsetLeft;
  view.my = mediaEl.offsetTop;
  canvas.width = Math.max(1, Math.round(r.width * view.dpr));
  canvas.height = Math.max(1, Math.round(r.height * view.dpr));
  const [fxF, fyF] = STORY.focus[setName];
  const sc = Math.max(view.cw / SET.w, view.ch / SET.h);
  view.dw = SET.w * sc;
  view.dh = SET.h * sc;
  view.dx = (view.cw - view.dw) * fxF;
  view.dy = (view.ch - view.dh) * fyF;
  if (videoEl) videoEl.style.objectPosition = `${fxF * 100}% ${fyF * 100}%`;
  fxCanvas.width = Math.max(1, Math.round(s.width));
  fxCanvas.height = Math.max(1, Math.round(s.height));
  fx.setTransform(1, 0, 0, 1, 0, 0);
  filmRenderer.setSmoothing();
  dirty = true;
}

let lastDrawn = -1;
function renderFrames(f, speedZoom = 1) {
  if (!dirty && Math.abs(f - lastDrawn) < 0.002) return;
  const a = clamp(Math.floor(f), 0, SET.count - 1);
  const b = Math.min(SET.count - 1, Math.ceil(f));
  prefetchWindow(Math.round(f), f >= lastDrawn ? 1 : -1);
  const lo = store.nearestBelow(a, 18);
  const hi = store.nearestAbove(b, 18);
  let entryA = lo >= 0 ? store.lru.get(lo) : null;
  let entryB = hi >= 0 ? store.lru.get(hi) : null;
  let mix = 0;
  if (entryA && entryB && hi > lo) {
    mix = clamp((f - lo) / (hi - lo), 0, 1);
  } else {
    const closest = store.nearestDecoded(Math.round(f));
    if (closest < 0) return;
    entryA = store.lru.get(closest);
    entryB = null;
    mix = 0;
  }
  if (!entryA) return;
  filmRenderer.draw(entryA, STORY.blend ? entryB : null, STORY.blend && mix > 0.015 ? mix : 0, view, speedZoom);
  lastDrawn = f;
  dirty = false;
}

/* ---------- UI: copy, dots, hint, finale, callouts ---------- */
const copyEl = $("#copy");
const dotsEl = $("#dots");
const hintEl = $("#hint");
const hintNext = $("#hintNext");
const finaleEl = $("#finale");
const calloutsEl = $("#callouts");

const copyItems = STORY.stages.map((s, i) => {
  const el = document.createElement("article");
  el.className = "copy__item";
  el.dataset.stage = i;
  el.innerHTML = `<p class="copy__kicker">${s.kicker}</p><h2 class="copy__title"><span class="caps">${s.caps}</span><em>${s.serif}</em></h2><p class="copy__sub">${s.sub}</p>`;
  copyEl.appendChild(el);
  return el;
});

const dots = STORY.stages.map((s, i) => {
  const b = document.createElement("button");
  b.className = "dot";
  b.type = "button";
  b.setAttribute("aria-label", `${s.caps} ${s.serif}`);
  b.addEventListener("click", () => goToStage(i));
  dotsEl.appendChild(b);
  return b;
});

const callouts = STORY.callouts.map((c) => {
  const el = document.createElement("div");
  el.className = "callout";
  el.innerHTML = `<i class="callout__pin"></i><i class="callout__line"></i><span class="callout__text">${c.label}</span>`;
  calloutsEl.appendChild(el);
  return { c, el };
});

let active = -1;
let hintText = null;
const copyHidden = new Uint8Array(STORY.stages.length);
const calloutHidden = new Uint8Array(STORY.callouts.length);
let lastFinaleO = -1;

function updateUI(p, f) {
  STORY.stages.forEach((s, i) => {
    const len = s.to - s.from;
    const fade = Math.min(0.28 * len, 0.036);
    let o = 0;
    let y = 22;
    if (p >= s.from && p <= s.to) {
      const inU = s.from === 0 ? 1 : clamp((p - s.from) / fade, 0, 1);
      const outU = clamp((s.to - p) / fade, 0, 1);
      if (inU < 1) {
        const e = easeOut(inU);
        o = e;
        y = 22 * (1 - e);
      } else if (outU < 1) {
        const e = easeOut(outU);
        o = e;
        y = -26 * (1 - e);
      } else {
        o = 1;
        y = 0;
      }
    }
    const vis = o > 0.001;
    if (!vis && copyHidden[i]) return;
    copyHidden[i] = vis ? 0 : 1;
    if (reduced) y = 0;
    const el = copyItems[i];
    el.classList.toggle("is-shown", vis);
    el.style.opacity = vis ? o.toFixed(3) : "0";
    if (vis) {
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    el.style.visibility = vis ? "visible" : "hidden";
  });

  let a = STORY.stages.findIndex((s) => p >= s.from && p < s.to);
  if (a < 0) a = STORY.stages.length - 1;
  if (a !== active) {
    active = a;
    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i === a);
      d.setAttribute("aria-current", i === a ? "step" : "false");
    });
  }

  const next = STORY.stages[a].hint || "";
  if (next !== hintText) {
    hintText = next;
    hintNext.textContent = hintText;
  }
  const hideHint = !next || p > STORY.finale.from - 0.015;
  hintEl.classList.toggle("is-hidden", hideHint);

  const fo = smooth(clamp((p - STORY.finale.from) / (STORY.finale.to - STORY.finale.from), 0, 1));
  if (Math.abs(fo - lastFinaleO) > 0.002 || (fo === 0 && lastFinaleO !== 0) || (fo === 1 && lastFinaleO !== 1)) {
    lastFinaleO = fo;
    finaleEl.style.opacity = fo.toFixed(3);
    finaleEl.style.setProperty("--fo", fo.toFixed(3));
    finaleEl.classList.toggle("is-interactive", fo > 0.65);
  }

  for (let idx = 0; idx < callouts.length; idx++) {
    const { c, el } = callouts[idx];
    const [s0, s1] = c.show;
    const w = 0.014;
    const o = Math.min(smooth(clamp((p - s0) / w, 0, 1)), smooth(clamp((s1 - p) / w, 0, 1)));
    const vis = o > 0.002;
    if (!vis && calloutHidden[idx]) continue;
    calloutHidden[idx] = vis ? 0 : 1;
    el.style.opacity = vis ? o.toFixed(3) : "0";
    if (!vis) continue;

    const keys = c.keys[setName];
    if (!keys) continue;
    let x = keys[0][1];
    let y2 = keys[0][2];
    for (let k = 1; k < keys.length; k++) {
      if (f <= keys[k][0]) {
        const [f0, x0, y0] = keys[k - 1];
        const [f1, x1, y1] = keys[k];
        const u = (f - f0) / (f1 - f0 || 1);
        x = x0 + (x1 - x0) * u;
        y2 = y0 + (y1 - y0) * u;
        break;
      } else {
        x = keys[k][1];
        y2 = keys[k][2];
      }
    }
    const sx = view.mx + par.x + view.dx + x * view.dw;
    const sy = view.my + par.y + view.dy + y2 * view.dh;
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy - 11).toFixed(1)}px, 0)`;
  }
}

/* ---------- Live causal dust layer + desktop cursor parallax ---------- */
const par = { x: 0, y: 0, tx: 0, ty: 0 };
if (finePointer && !reduced) {
  addEventListener("pointermove", (e) => {
    par.tx = (e.clientX / innerWidth - 0.5) * -14;
    par.ty = (e.clientY / innerHeight - 0.5) * -9;
  }, { passive: true });
}

const fxOn = STORY.fx.enabled && !reduced;
function spawn(z) {
  return {
    x: (Math.random() - 0.5) * 2.4,
    y: (Math.random() - 0.5) * 1.6,
    z: 0.15 + z * 0.85,
    r: 0.4 + Math.random() * 1.35,
    a: 0.2 + Math.random() * 0.42
  };
}
const motes = fxOn ? Array.from({ length: STORY.fx.count[setName] }, () => spawn(Math.random())) : [];
if (!motes.length) fxCanvas.style.display = "none";
// Pre-baked 16x16 soft cyan glow sprite avoids 40x arc()/fill() path rasterization per frame
const moteSprite = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d");
  const [r, gr, b] = STORY.fx.color;
  const grad = g.createRadialGradient(8, 8, 0.5, 8, 8, 8);
  grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 16);
  return c;
})();

function drawFx(dFilm, dt) {
  if (!fxOn || !storyInView || !motes.length) return;
  const w = view.sw;
  const h = view.sh;
  fx.clearRect(0, 0, w, h);
  for (const m of motes) {
    m.z -= dFilm * STORY.fx.speed + dt * 0.0035;
    m.y -= dt * 0.005;
    if (m.z < 0.12 || m.y < -0.9) Object.assign(m, spawn(1));
    if (m.z > 1.05) Object.assign(m, spawn(0.02));
    const s = 0.55 / m.z;
    const px = w / 2 + m.x * s * w * 0.5 + par.x * (1 / m.z);
    const py = h / 2 + m.y * s * h * 0.5 + par.y * (1 / m.z);
    if (px < -12 || px > w + 12 || py < -12 || py > h + 12) continue;
    const sz = Math.max(2, m.r * s * 3.5);
    fx.globalAlpha = m.a * clamp((1.05 - m.z) * 3, 0, 1) * clamp(m.z * 4, 0, 1);
    fx.drawImage(moteSprite, (px - sz * 0.5) | 0, (py - sz * 0.5) | 0, sz, sz);
  }
  fx.globalAlpha = 1;
}

/* ---------- Scroll: Lenis (wheel only) + ScrollTrigger ---------- */
storyEl.style.height = `calc(var(--vh) * ${STORY.scrollLength})`;
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis = null;
let inputMode = "wheel";
if (!reduced) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true, syncTouch: false });
  lenis.on("scroll", ScrollTrigger.update);
  window.__lenis = lenis;
  addEventListener("wheel", () => { inputMode = "wheel"; }, { passive: true });
  addEventListener("touchstart", () => { inputMode = "touch"; }, { passive: true });
}

let target = 0;
let current = 0;
let filmT = 0;
let storyInView = true;

const st = ScrollTrigger.create({
  trigger: storyEl,
  start: "top top",
  end: "bottom bottom",
  onUpdate: (self) => { target = self.progress; },
  onRefresh: (self) => { target = self.progress; }
});

new IntersectionObserver((entries) => {
  storyInView = entries.some((e) => e.isIntersecting);
}, { rootMargin: "200px 0px" }).observe(storyEl);

function progressToY(p) {
  return st.start + p * (st.end - st.start);
}

function goToStage(i) {
  const s = STORY.stages[i];
  const fade = Math.min(0.28 * (s.to - s.from), 0.036);
  const p = s.from === 0 ? 0 : s.from + fade + 0.012;
  const y = progressToY(p);
  if (lenis) lenis.scrollTo(y, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: "auto" });
}

/* ---------- Navigation helpers for top mode bar & finale CTA ---------- */
function wireNavLinks() {
  const navStory = $("#navStory");
  const navLive = $("#navLive");
  const navSpecs = $("#navSpecs");
  const cta = $("#finaleToLive");

  const smoothJump = (selector) => (e) => {
    const el = document.querySelector(selector);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(top, { duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  if (navStory) navStory.addEventListener("click", smoothJump("#story"));
  if (navLive) navLive.addEventListener("click", smoothJump("#drive"));
  if (navSpecs) navSpecs.addEventListener("click", smoothJump("#reading"));
  if (cta) cta.addEventListener("click", smoothJump("#drive"));

  const updateCurrentNav = () => {
    const y = window.scrollY + innerHeight * 0.35;
    const driveTop = ($("#drive")?.offsetTop) || Infinity;
    const specsTop = ($("#reading")?.offsetTop) || Infinity;
    const mode = y >= specsTop ? "specs" : y >= driveTop ? "live" : "story";
    navStory?.classList.toggle("is-current", mode === "story");
    navLive?.classList.toggle("is-current", mode === "live");
    navSpecs?.classList.toggle("is-current", mode === "specs");
  };
  addEventListener("scroll", updateCurrentNav, { passive: true });
  updateCurrentNav();

  // Плавное появление карточек технического паспорта (#reading) при входе в экран
  const readingEl = $("#reading");
  if (readingEl && !reduced) {
    readingEl.classList.add("is-entering");
    const ro = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        readingEl.classList.remove("is-entering");
        ro.disconnect();
      }
    }, { threshold: 0.08 });
    ro.observe(readingEl);
  }
}
wireNavLinks();

/* ---------- Single GSAP ticker loop ---------- */
let ready = false;
let lastF = -1;
let lastUiP = -1;
let lastUiPx = 0;
let lastUiPy = 0;
const stats = { maxSpeed: 0 };

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(0.05, deltaMs / 1000);
  if (lenis) lenis.raf(time * 1000);
  if (!ready) return;
  if (!storyInView && Math.abs(target - current) < 1e-5) return;

  if (reduced || (lenis && inputMode === "wheel")) {
    current = target;
  } else {
    const k = 1 - Math.exp(-STORY.smoothing.touch * dt);
    current += (target - current) * k;
    if (Math.abs(target - current) < 1e-5) current = target;
  }

  let t = mapKeys(current, STORY.timeKeys);
  if (reduced) {
    const s = STORY.stages[Math.max(0, active)];
    t = mapKeys((s.from + s.to) / 2, STORY.timeKeys);
  }
  const maxDt = (STORY.maxFramesPerSecond * dt) / (SET.count - 1);
  if (!reduced && Math.abs(t - filmT) > maxDt) {
    t = filmT + Math.sign(t - filmT) * maxDt;
  }
  const dFilm = t - filmT;
  filmT = t;
  if (dt > 0) {
    stats.maxSpeed = Math.max(stats.maxSpeed, (Math.abs(dFilm) * (SET.count - 1)) / dt);
  }
  const f = t * (SET.count - 1);
  const speedZoom = reduced ? 1 : 1 + clamp(Math.abs(dFilm) * 0.42, 0, 0.016);

  renderFrames(f, speedZoom);
  par.x += (par.tx - par.x) * (1 - Math.exp(-4 * dt));
  par.y += (par.ty - par.y) * (1 - Math.exp(-4 * dt));
  if (Math.abs(par.x - lastUiPx) > 0.04 || Math.abs(par.y - lastUiPy) > 0.04) {
    mediaEl.style.transform = `translate3d(${par.x.toFixed(2)}px, ${par.y.toFixed(2)}px, 0)`;
  }
  if (Math.abs(f - lastF) > 0.002 || Math.abs(current - lastUiP) > 0.0002 || Math.abs(par.x - lastUiPx) > 0.06) {
    updateUI(current, f);
    lastUiP = current;
    lastUiPx = par.x;
    lastUiPy = par.y;
  }
  drawFx(Math.abs(dFilm), dt);
  lastF = f;
});

/* ---------- Boot ---------- */
const bar = $("#preloaderBar");
const pct = $("#preloaderPct");
const onProgress = (v) => {
  if (bar) bar.style.transform = `scaleX(${v.toFixed(3)})`;
  if (pct) pct.textContent = `${Math.round(v * 100)}%`;
};

poster.src = frameURL(0);
new ResizeObserver(() => {
  resize();
  ScrollTrigger.refresh();
}).observe(stageEl);
resize();

(async () => {
  try {
    await preloadFrames(onProgress);
  } catch (e) {
    console.warn("story preload fallback to poster", e);
  }
  await (document.fonts?.ready || Promise.resolve()).catch(() => {});
  dirty = true;
  renderFrames(0);
  updateUI(current, lastF);
  ready = true;
  root.classList.add("story-ready");
  $("#preloader")?.classList.add("is-done");
  ScrollTrigger.refresh();
  window.dispatchEvent(new CustomEvent("story:ready"));
})();

window.__story = {
  state: () => ({
    target,
    current,
    filmT,
    frame: Math.round(lastF),
    active,
    loaded: store.loaded,
    count: SET.count,
    set: setName,
    ready
  }),
  goTo: goToStage,
  stats: () => ({ ...stats }),
  resetStats: () => { stats.maxSpeed = 0; },
  progressTo: (p) => {
    const y = progressToY(p);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }
};

// Act I — Build-Story Scroll Cinema Engine (adapted from build-story-scroll-site/starter/main.js).
// Zero CDN: uses vendored GSAP + ScrollTrigger (window.gsap / window.ScrollTrigger) and local Lenis ESM.
import Lenis from "./vendor/lenis.mjs";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

export const FLOW_CLIPS_ENABLED = false;

export const STORY = {
  source: "frames",
  scrollLength: 6.8,
  smoothing: { wheel: 11, touch: 12 },
  maxFramesPerSecond: 260,
  blend: true,
  focus: { desktop: [0.50, 0.50], mobile: [0.50, 0.45] },
  sets: {
    desktop: { dir: "assets/frames/desktop/", count: 320, ext: "webp", pad: 4, w: 1280, h: 720 },
    mobile:  { dir: "assets/frames/mobile/",  count: 220, ext: "webp", pad: 4, w: 540,  h: 960 }
  },
  videoManifest: "assets/video/manifest.json",
  // Continuous 3D timeline mapping: scroll progress [0..1] -> rendered 3D Apptronik Apollo assembly [0..1]
  // 1 wireframe (0-.115) -> 2 actuators (.115-.275) -> 3 shell (.275-.445) -> 4 visor/oled (.445-.60) -> 5 hero (.60-.715) -> 6 optics (.715-.875) -> 7 core (.875-1.0)
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
      sub: "Световой CAD-каркас Apptronik Apollo в масштабе 1,73 м задаёт геометрию и опору на пятиосевые стопы.",
      hint: "Собрать хребет"
    },
    {
      from: 0.13, to: 0.26,
      kicker: "ЭТАП 02 / 07",
      caps: "Силовой", serif: "хребет",
      sub: "Линейные электроактуаторы из школы NASA Valkyrie формируют несущий скелет без капли гидравлики.",
      hint: "Закрыть панцирь"
    },
    {
      from: 0.26, to: 0.39,
      kicker: "ЭТАП 03 / 07",
      caps: "Жемчужный", serif: "панцирь",
      sub: "Индустриальный профиль argo design закрывает кинематику и защищает схват до 25 кг полезной нагрузки.",
      hint: "Открыть визор"
    },
    {
      from: 0.39, to: 0.52,
      kicker: "ЭТАП 04 / 07",
      caps: "Панель", serif: "и сигнал",
      sub: "Светлая лицевая панель, стереолинзы, LED-индикатор речи и нагрудный OLED-дисплей APPTRONIK переводят состояние робота оператору.",
      hint: "Зажечь контур"
    },
    {
      from: 0.52, to: 0.66,
      kicker: "ЭТАП 05 / 07",
      caps: "Смена", serif: "за 4 часа",
      sub: "Спинной съёмный аккумулятор с боковыми камерами и 36 активных осей собраны в корпус массой 73 кг.",
      hint: "Сквозь визор"
    },
    {
      from: 0.66, to: 0.80,
      kicker: "АКТ I · ОПТИКА",
      caps: "Сквозь", serif: "оптику",
      sub: "Камера проходит через тёмную стереолинзу глубины внутрь оптического и инерциального контура.",
      hint: "Войти в ядро"
    },
    {
      from: 0.80, to: 0.93,
      kicker: "АКТ I · ЯДРО",
      caps: "Разум", serif: "в движении",
      sub: "Вычислительное ядро объединяет зрение и линейные приводы в реальном времени.",
      hint: ""
    }
  ],
  finale: { from: 0.93, to: 0.985 },
  callouts: [
    {
      label: "CAD · 1,73 м",
      show: [0.015, 0.12],
      keys: {
        desktop: [[0, 0.48, 0.24], [38, 0.48, 0.30], [319, 0.48, 0.30]],
        mobile:  [[0, 0.48, 0.23], [24, 0.48, 0.25], [219, 0.48, 0.25]]
      }
    },
    {
      label: "Linear · Valkyrie",
      show: [0.15, 0.245],
      keys: {
        desktop: [[38, 0.50, 0.49], [85, 0.50, 0.47], [319, 0.50, 0.47]],
        mobile:  [[24, 0.49, 0.42], [57, 0.49, 0.40], [219, 0.49, 0.40]]
      }
    },
    {
      label: "Схват · 25 кг",
      show: [0.28, 0.375],
      keys: {
        desktop: [[88, 0.43, 0.50], [137, 0.44, 0.48], [319, 0.44, 0.48]],
        mobile:  [[59, 0.44, 0.48], [96, 0.45, 0.47], [219, 0.45, 0.47]]
      }
    },
    {
      label: "OLED + E-Ink",
      show: [0.41, 0.505],
      keys: {
        desktop: [[140, 0.50, 0.40], [186, 0.50, 0.42], [319, 0.50, 0.42]],
        mobile:  [[98, 0.48, 0.38], [128, 0.48, 0.40], [219, 0.48, 0.40]]
      }
    },
    {
      label: "Стереовизор 360°",
      show: [0.68, 0.785],
      keys: {
        desktop: [[229, 0.50, 0.38], [275, 0.50, 0.44], [319, 0.50, 0.44]],
        mobile:  [[158, 0.48, 0.36], [190, 0.48, 0.42], [219, 0.48, 0.42]]
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
const videoElA = $("#filmVideo");
const videoElB = $("#filmVideoB");
const flowSlotEl = $("#flowSlot");
const finaleNeuralEl = $("#finaleNeuralVideo");
const readingNeuralEl = $("#readingNeuralVideo");
const actBeamEl = $("#actBeam");
const actBeamVideoEl = $("#actBeamVideo");
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
      draw(entryA, entryB, mix, vw, _zoom = 1, _transMode = 0) {
        const d = vw.dpr;
        ctx2d.globalAlpha = 1;
        ctx2d.drawImage(entryA.src, vw.dx * d, vw.dy * d, vw.dw * d, vw.dh * d);
        if (entryB && mix > 0.02) {
          ctx2d.globalAlpha = mix;
          ctx2d.drawImage(entryB.src, vw.dx * d, vw.dy * d, vw.dw * d, vw.dh * d);
        }
        ctx2d.globalAlpha = 1;
      },
      invalidate() {},
      resetCache() {}
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
    uniform float u_transMode;
    uniform vec2 u_scale;
    uniform vec2 u_offset;
    out vec4 outColor;
    void main() {
      float m = clamp(u_mix, 0.0, 1.0);
      float sMix = m * m * (3.0 - 2.0 * m);
      float zoomA = max(0.85, u_zoom) + (u_transMode > 0.5 ? sMix * 0.020 : 0.0);
      vec2 tuvA = ((v_uv - 0.5) / zoomA + 0.5) * u_scale + u_offset;
      vec4 col = texture(u_texA, tuvA);
      if (m > 0.005) {
        float zoomB = max(0.85, u_zoom) + (u_transMode > 0.5 ? (1.0 - sMix) * 0.034 : 0.0);
        vec2 tuvB = ((v_uv - 0.5) / zoomB + 0.5) * u_scale + u_offset;
        vec4 colB = texture(u_texB, tuvB);
        float w = sMix;
        float rim = 0.0;
        if (u_transMode > 1.5) {
          float dist = length((v_uv - vec2(0.5, 0.46)) * vec2(1.18, 1.0));
          float edge = mix(-0.18, 1.06, sMix);
          float feather = 0.24;
          float iris = 1.0 - smoothstep(edge - feather, edge + feather, dist);
          w = mix(sMix, iris, 0.86);
          rim = exp(-pow((dist - edge) * 7.5, 2.0)) * sin(sMix * 3.14159265);
        } else if (u_transMode > 0.5) {
          float diag = v_uv.x * 0.72 + (1.0 - v_uv.y) * 0.42;
          float edge = mix(-0.22, 1.36, sMix);
          float feather = 0.26;
          float wipe = 1.0 - smoothstep(edge - feather, edge + feather, diag);
          w = mix(sMix, wipe, 0.85);
          rim = exp(-pow((diag - edge) * 7.0, 2.0)) * sin(sMix * 3.14159265);
        }
        col = mix(col, colB, clamp(w, 0.0, 1.0));
        vec3 mindRim = mix(vec3(0.0, 0.96, 1.0), vec3(0.29, 0.23, 1.0), 0.38);
        col.rgb += mindRim * (rim * 0.16);
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
  const uTransMode = gl.getUniformLocation(prog, "u_transMode");
  const uScale = gl.getUniformLocation(prog, "u_scale");
  const uOffset = gl.getUniformLocation(prog, "u_offset");

  let idA = -1, genA = -1;
  let idB = -1, genB = -1;
  let wA = 0, hA = 0, wB = 0, hB = 0;

  return {
    isGL: true,
    setSmoothing() {},
    invalidate(id) {
      if (idA === id) { idA = -1; genA = -1; }
      if (idB === id) { idB = -1; genB = -1; }
    },
    resetCache() {
      idA = -1; genA = -1; wA = 0; hA = 0;
      idB = -1; genB = -1; wB = 0; hB = 0;
    },
    draw(entryA, entryB, mix, vw, zoom = 1, transMode = 0) {
      gl.viewport(0, 0, cvs.width, cvs.height);
      const sx = vw.cw / (vw.dw || 1);
      const sy = vw.ch / (vw.dh || 1);
      const ox = -vw.dx / (vw.dw || 1);
      const oy = -vw.dy / (vw.dh || 1);
      gl.uniform2f(uScale, sx, sy);
      gl.uniform2f(uOffset, ox, oy);
      gl.uniform1f(uZoom, zoom);
      gl.uniform1f(uTransMode, transMode);
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
      if (entryB && mix > 0.005) {
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
  nearestBelow(i, maxDist = SET.count) {
    for (let d = 0; d <= maxDist; d++) {
      const k = i - d;
      if (k >= 0 && this.lru.has(k)) return k;
    }
    return -1;
  },
  nearestAbove(i, maxDist = SET.count) {
    for (let d = 0; d <= maxDist; d++) {
      const k = i + d;
      if (k < SET.count && this.lru.has(k)) return k;
    }
    return -1;
  }
};

const decodeWaiters = new Map();

function settleDecodeWaiter(i, ok) {
  const arr = decodeWaiters.get(i);
  if (!arr) return;
  decodeWaiters.delete(i);
  for (const resolve of arr) resolve(ok);
}

function putLru(i, entry) {
  if (store.lru.has(i)) {
    const prev = store.lru.get(i);
    if (prev.isBmp) try { prev.src.close(); } catch {}
    store.lru.delete(i);
    filmRenderer.invalidate(i);
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
    filmRenderer.invalidate(worstKey);
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
    decodeToLru(best)
      .then(() => settleDecodeWaiter(best, store.lru.has(best)))
      .catch(() => settleDecodeWaiter(best, false))
      .finally(() => {
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

function requestDecodeAsync(i) {
  if (i < 0 || i >= SET.count || !store.blobs[i]) return Promise.resolve(false);
  if (store.lru.has(i)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const list = decodeWaiters.get(i) || [];
    list.push(resolve);
    decodeWaiters.set(i, list);
    decodeQueue.add(i);
    pumpDecodeQueue();
  });
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
    await requestDecodeAsync(i);
    onProgress(++n / gate.length);
  });
  // Загружаем оставшиеся WebP-блоки и прогреваем начало + опорные кадры pass[2] через общую очередь декода
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
  if (videoElA) videoElA.style.objectPosition = `${fxF * 100}% ${fyF * 100}%`;
  if (videoElB) videoElB.style.objectPosition = `${fxF * 100}% ${fyF * 100}%`;
  fxCanvas.width = Math.max(1, Math.round(s.width));
  fxCanvas.height = Math.max(1, Math.round(s.height));
  fx.setTransform(1, 0, 0, 1, 0, 0);
  filmRenderer.setSmoothing();
  if (typeof flow !== "undefined") {
    flow.lastDrawSig = "";
    flow.activeBox = null;
  }
  dirty = true;
}

/* ---------- Google Flow VideoScrubEngine (All-Intra MP4, zero-abort buffered per-stage pool) ---------- */
const VIDEO_IDS = Array.from({ length: 8 }, (_, i) => -(i + 2));
const canPlayH264 = (() => {
  try {
    const v = document.createElement("video");
    return Boolean(v.canPlayType && (v.canPlayType('video/mp4; codecs="avc1.4D401F"') || v.canPlayType('video/mp4; codecs="avc1.42E01E"')));
  } catch {
    return false;
  }
})();

function isSlotFullyBuffered(slot) {
  const el = slot?.el;
  if (!el || el.readyState < 2 || el.videoWidth <= 0 || !el.buffered || el.buffered.length === 0) return false;
  const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (flow.clips[slot.stageIdx]?.durationSec || 8);
  const bEnd = el.buffered.end(el.buffered.length - 1);
  return el.buffered.start(0) <= 0.15 && bEnd >= Math.max(0.5, dur - 0.15);
}

function createStageVideoEl(idx) {
  if (idx === 0 && videoElA) return videoElA;
  if (idx === 1 && videoElB) return videoElB;
  const v = document.createElement("video");
  v.className = "story-stage__video";
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.setAttribute("aria-hidden", "true");
  mediaEl.appendChild(v);
  return v;
}

function createVideoSlot(idx) {
  const el = createStageVideoEl(idx);
  if (!el) return null;
  el.muted = true;
  el.playsInline = true;
  const slot = {
    el,
    entry: { id: VIDEO_IDS[idx] ?? -(idx + 2), gen: 0, src: el },
    stageIdx: idx,
    bound: false,
    failed: false,
    pendingTarget: null,
    readyWaiters: []
  };
  const resolveWaiters = (ok) => {
    if (!slot.readyWaiters.length) return;
    const list = slot.readyWaiters.splice(0, slot.readyWaiters.length);
    for (const fn of list) fn(ok);
  };
  const flushSeekOrResolve = () => {
    if (isSlotFullyBuffered(slot)) {
      if (slot.pendingTarget !== null && !el.seeking) {
        const t = slot.pendingTarget;
        slot.pendingTarget = null;
        if (Math.abs((el.currentTime || 0) - t) > 0.015) {
          el.currentTime = t;
          return;
        }
      }
      if (!el.seeking) {
        slot.entry.gen++;
        flow.lastGoodSlot = slot;
        dirty = true;
        resolveWaiters(true);
      }
    }
  };
  el.addEventListener("loadeddata", flushSeekOrResolve);
  el.addEventListener("canplaythrough", flushSeekOrResolve);
  el.addEventListener("progress", flushSeekOrResolve);
  el.addEventListener("suspend", flushSeekOrResolve);
  el.addEventListener("seeked", () => {
    slot.entry.gen++;
    flow.lastGoodSlot = slot;
    dirty = true;
    if (slot.pendingTarget !== null && !el.seeking && isSlotFullyBuffered(slot)) {
      const t = slot.pendingTarget;
      slot.pendingTarget = null;
      if (Math.abs((el.currentTime || 0) - t) > 0.015) {
        el.currentTime = t;
        return;
      }
    }
    if (el.readyState >= 2 && el.videoWidth > 0) resolveWaiters(true);
  });
  el.addEventListener("error", () => {
    slot.failed = true;
    resolveWaiters(false);
  });
  if (typeof el.requestVideoFrameCallback === "function") {
    const onFrame = () => {
      slot.entry.gen++;
      flow.lastGoodSlot = slot;
      dirty = true;
      el.requestVideoFrameCallback(onFrame);
    };
    el.requestVideoFrameCallback(onFrame);
  }
  return slot;
}

const flow = {
  manifest: null,
  hasClips: false,
  transW: 0.032,
  clips: [],
  activeStage: -1,
  activeBox: null,
  lastGoodSlot: null,
  lastDrawSig: "",
  slots: []
};

function fitVideoBox(vwSrc, vhSrc) {
  const [fxF, fyF] = STORY.focus[setName];
  const w = vwSrc || 1280;
  const h = vhSrc || 720;
  const sc = Math.max(view.cw / w, view.ch / h);
  const dw = w * sc;
  const dh = h * sc;
  return { cw: view.cw, ch: view.ch, dpr: view.dpr, dw, dh, dx: (view.cw - dw) * fxF, dy: (view.ch - dh) * fyF };
}

function validDur(el, fallback = 8) {
  return Number.isFinite(el?.duration) && el.duration > 0 ? el.duration : fallback;
}

function stageStartSec(idx) {
  const stg = STORY.stages[idx];
  const clip = flow.clips[idx];
  const dur = clip?.durationSec || 8;
  return stg?.reverse ? Math.max(0.04, dur - 0.06) : 0.02;
}

function seekSlotTo(slot, targetSec) {
  if (!slot || !slot.bound || slot.failed) return;
  const el = slot.el;
  const clip = flow.clips[slot.stageIdx];
  const dur = validDur(el, clip?.durationSec || 8);
  const clamped = clamp(targetSec, 0.02, Math.max(0.04, dur - 0.04));
  slot.pendingTarget = clamped;
  // Wait until full MP4 is buffered in RAM before calling currentTime — guarantees 0 aborted HTTP streams!
  if (!isSlotFullyBuffered(slot)) return;
  if (!el.seeking && Math.abs((el.currentTime || 0) - clamped) > 0.015) {
    el.currentTime = clamped;
    slot.pendingTarget = null;
  } else if (!el.seeking) {
    slot.pendingTarget = null;
  }
}

function ensureStageSlot(idx, initSec = stageStartSec(idx)) {
  if (idx < 0 || idx >= flow.clips.length) return null;
  const clip = flow.clips[idx];
  if (!clip?.available) return null;
  let slot = flow.slots[idx];
  if (!slot) {
    slot = createVideoSlot(idx);
    flow.slots[idx] = slot;
  }
  slot.pendingTarget = initSec;
  if (!slot.bound) {
    slot.bound = true;
    slot.failed = false;
    slot.el.dataset.src = clip.file;
    slot.el.src = clip.file;
    slot.el.load();
  }
  return slot;
}

function waitSlotReady(idx, timeoutMs = 2500) {
  if (!canPlayH264) return Promise.resolve(false);
  const wantSec = stageStartSec(idx);
  const slot = ensureStageSlot(idx, wantSec);
  if (!slot || slot.failed) return Promise.resolve(false);
  if (isSlotFullyBuffered(slot) && Math.abs((slot.el.currentTime || 0) - wantSec) < 0.2) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    slot.readyWaiters.push(finish);
    setTimeout(() => finish(isSlotFullyBuffered(slot)), timeoutMs);
  });
}

async function initFlowManifest() {
  const insertsSection = $("#flowInsertsSection");
  const slotsGrid = $("#flowSlotsGrid");
  if (flowSlotEl) flowSlotEl.hidden = true;
  if (insertsSection) insertsSection.hidden = true;
  if (!FLOW_CLIPS_ENABLED || !STORY.videoManifest) {
    flow.hasClips = false;
    flow.clips = [];
    return;
  }
  try {
    const res = await fetch(STORY.videoManifest, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    flow.manifest = data;
    flow.transW = Number(data.crossfadeWidth) || 0.028;
    const activeVideoMode = Boolean(canPlayH264 && data.enabled !== false && data.mode !== "placeholder" && data.mode !== "disabled");
    const rawList = Array.isArray(data?.inserts) ? data.inserts : (Array.isArray(data?.clips) ? data.clips : []);
    const activeRaw = rawList.filter((c) => {
      const useMobile = setName === "mobile" && c.mobileAvailable && c.mobile;
      return activeVideoMode && (useMobile ? Boolean(c.mobileAvailable && c.mobile) : Boolean(c.available && c.desktop));
    });
    const count = activeRaw.length;
    flow.clips = activeRaw.map((c, idx) => {
      const useMobile = setName === "mobile" && c.mobileAvailable && c.mobile;
      const file = useMobile ? c.mobile : c.desktop;
      const span = 0.80 / Math.max(1, count);
      const from = Number.isFinite(c.from) ? c.from : Number((0.06 + idx * span).toFixed(3));
      const to = Number.isFinite(c.to) ? c.to : Number((from + Math.min(0.16, span * 0.82)).toFixed(3));
      return {
        id: c.id || `insert_${idx + 1}`,
        title: c.title || c.id || `Вставка ${idx + 1}`,
        file,
        from,
        to,
        reverse: Boolean(c.reverse),
        transition: Number(c.transition) || (idx % 2 === 0 ? 1 : 2),
        durationSec: Number(c.durationSec) || 8,
        resolution: useMobile ? (c.mobileResolution || "854x480") : (c.resolution || "1280x720"),
        available: true
      };
    });
    flow.hasClips = flow.clips.length > 0;
    if (slotsGrid && insertsSection) {
      slotsGrid.innerHTML = flow.clips.map((c, idx) => (
        `<div class="flow-card is-ready"><b>${String(idx + 1).padStart(2, "0")}</b><span>${c.id}</span><em>${c.resolution} · ${c.title}</em></div>`
      )).join("");
      insertsSection.hidden = !flow.hasClips;
    }
  } catch {
    // Без manifest/mp4 бесшовно работаем на 3D WebP-секвенции
  }
}

function resolveFrameEntries(f) {
  const a = clamp(Math.floor(f), 0, SET.count - 1);
  const b = Math.min(SET.count - 1, Math.ceil(f));
  const lo = store.nearestBelow(a, SET.count);
  const hi = store.nearestAbove(b, SET.count);
  let entryA = lo >= 0 ? store.lru.get(lo) : null;
  let entryB = hi >= 0 ? store.lru.get(hi) : null;
  let mix = 0;
  if (entryA && entryB && hi > lo) {
    mix = clamp((f - lo) / (hi - lo), 0, 1);
  } else if (entryA && !entryB) {
    mix = 0;
  } else if (!entryA && entryB) {
    entryA = entryB;
    entryB = null;
    mix = 0;
  } else {
    const closest = store.nearestDecoded(Math.round(f));
    if (closest < 0) return null;
    entryA = store.lru.get(closest);
    entryB = null;
    mix = 0;
  }
  return entryA ? { entryA, entryB, mix } : null;
}

function findActiveInsert(p) {
  for (let i = 0; i < flow.clips.length; i++) {
    const c = flow.clips[i];
    if (p >= c.from && p <= c.to) return i;
  }
  return -1;
}

function tryRenderFlowVideo(p, f, speedZoom) {
  if (!FLOW_CLIPS_ENABLED || !flow.hasClips) return null;
  const activeIdx = findActiveInsert(p);
  flow.activeStage = activeIdx;
  if (activeIdx < 0) {
    flow.activeBox = null;
    const aheadIdx = flow.clips.findIndex((c) => p >= c.from - 0.08 && p < c.from);
    if (aheadIdx >= 0) ensureStageSlot(aheadIdx, flow.clips[aheadIdx].reverse ? (flow.clips[aheadIdx].durationSec - 0.06) : 0.02);
    return null;
  }

  const clipA = flow.clips[activeIdx];
  const localU = clamp((p - clipA.from) / (clipA.to - clipA.from || 1), 0, 1);
  const uEffA = clipA.reverse ? 1 - localU : localU;
  const slotA = ensureStageSlot(activeIdx, uEffA * Math.max(0.04, clipA.durationSec - 0.06));
  if (!slotA) return null;

  const durA = validDur(slotA.el, clipA.durationSec);
  seekSlotTo(slotA, 0.02 + uEffA * Math.max(0.04, durA - 0.06));

  if (activeIdx + 1 < flow.clips.length && localU > 0.35) {
    const nxt = flow.clips[activeIdx + 1];
    ensureStageSlot(activeIdx + 1, nxt.reverse ? Math.max(0.04, nxt.durationSec - 0.06) : 0.02);
  }
  if (!isSlotFullyBuffered(slotA)) return null;

  const tw = Math.min(flow.transW, (clipA.to - clipA.from) * 0.25);
  let entryB = null;
  let mix = 0;
  let transMode = 0;
  if (tw > 0.002) {
    if (p < clipA.from + tw) {
      const bg = resolveFrameEntries(f);
      if (bg) {
        entryB = bg.entryA;
        mix = 1 - clamp((p - clipA.from) / tw, 0, 1);
        transMode = clipA.transition || 1;
      }
    } else if (p > clipA.to - tw) {
      const bg = resolveFrameEntries(f);
      if (bg) {
        entryB = bg.entryA;
        mix = clamp((p - (clipA.to - tw)) / tw, 0, 1);
        transMode = clipA.transition || 1;
      }
    }
  }

  const vw = fitVideoBox(slotA.el.videoWidth, slotA.el.videoHeight);
  flow.activeBox = vw;
  const sig = `${slotA.entry.id}:${slotA.entry.gen}:${entryB ? `${entryB.id}:${entryB.gen}` : -1}:${mix.toFixed(3)}:${speedZoom.toFixed(4)}:${transMode}:${vw.cw}:${vw.ch}`;
  if (!dirty && sig === flow.lastDrawSig) return clipA;
  flow.lastDrawSig = sig;
  filmRenderer.draw(slotA.entry, entryB, mix, vw, speedZoom, transMode);
  return clipA;
}

let lastDrawn = -1;
function renderFrames(f, speedZoom = 1, p = current) {
  prefetchWindow(Math.round(f), f >= lastDrawn ? 1 : -1);
  if (tryRenderFlowVideo(p, f, speedZoom)) {
    lastDrawn = f;
    dirty = false;
    return;
  }
  if (!dirty && Math.abs(f - lastDrawn) < 0.002) return;
  const res = resolveFrameEntries(f);
  if (!res) return;
  filmRenderer.draw(res.entryA, STORY.blend ? res.entryB : null, STORY.blend && res.mix > 0.015 ? res.mix : 0, view, speedZoom);
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
let flowBadgeKey = "";
const calloutHidden = new Uint8Array(STORY.callouts.length);
let lastFinaleO = -1;

// GSAP timeline for Act I stage typography (0..1 normalized, stagger kicker -> title -> sub, wide crossfade, zero scale)
const copyTL = gsap.timeline({ paused: true });
copyItems.forEach((el, i) => {
  const s = STORY.stages[i];
  const kids = [
    el.querySelector(".copy__kicker"),
    el.querySelector(".copy__title"),
    el.querySelector(".copy__sub")
  ].filter(Boolean);
  if (i === 0) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    gsap.set(kids, { opacity: 1, y: 0 });
  } else {
    gsap.set(el, { autoAlpha: 0, y: 20 });
    gsap.set(kids, { opacity: 0, y: 12 });
    const tIn = Math.max(0, s.from - 0.010);
    copyTL.to(el, { autoAlpha: 1, y: 0, duration: 0.026, ease: "power2.out" }, tIn);
    copyTL.to(kids, { opacity: 1, y: 0, duration: 0.028, stagger: 0.006, ease: "power2.out" }, tIn);
  }
  const tOut = Math.max(0.01, s.to - 0.018);
  copyTL.to(el, { autoAlpha: 0, y: -22, duration: 0.030, ease: "power2.in" }, tOut);
});
copyTL.set({}, {}, 1);
copyTL.progress(0);

function updateFlowBadge(insertClip) {
  if (!flowSlotEl) return;
  const videoActive = Boolean(FLOW_CLIPS_ENABLED && insertClip);
  const key = videoActive ? `${insertClip.id}:1` : "0";
  if (key === flowBadgeKey) return;
  flowBadgeKey = key;
  flowSlotEl.hidden = !videoActive;
  flowSlotEl.classList.toggle("is-video", videoActive);
  if (videoActive) {
    flowSlotEl.textContent = `FLOW · ${insertClip.id} · ${insertClip.resolution || "720p"}`;
  }
}

function updateUI(p, f) {
  let a = STORY.stages.findIndex((s) => p >= s.from && p < s.to);
  if (a < 0) a = STORY.stages.length - 1;

  if (reduced) {
    copyItems.forEach((el, i) => {
      const show = i === a && p < STORY.finale.to;
      el.style.visibility = show ? "visible" : "hidden";
      el.style.opacity = show ? "1" : "0";
      el.style.transform = "none";
    });
  } else {
    copyTL.progress(clamp(p, 0, 1));
  }

  if (a !== active) {
    active = a;
    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i === a);
      d.setAttribute("aria-current", i === a ? "step" : "false");
    });
  }
  const activeInsIdx = (FLOW_CLIPS_ENABLED && flow.hasClips) ? findActiveInsert(p) : -1;
  const activeIns = activeInsIdx >= 0 ? flow.clips[activeInsIdx] : null;
  updateFlowBadge(activeIns);

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
  syncAmbientVideos(fo);

  const box = (FLOW_CLIPS_ENABLED && activeIns && flow.activeBox) ? flow.activeBox : view;
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
    const sx = view.mx + par.x + box.dx + x * box.dw;
    const sy = view.my + par.y + box.dy + y2 * box.dh;
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

/* ---------- Scroll: Single smoother (Lenis on wheel, native momentum on touch) + Sticky overlap ---------- */
storyEl.style.height = `calc(var(--vh) * ${STORY.scrollLength + 1})`;
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
let bridgeCovered = false;
let bridgeProgress = 0;
let lastBeamOp = -1;
let lastBeamSeekT = -1;
let finalePlaying = false;

const lazyVideoBlobPromises = new Map();
function fetchVideoBlobUrl(url) {
  let p = lazyVideoBlobPromises.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? URL.createObjectURL(b) : url))
      .catch(() => url);
    lazyVideoBlobPromises.set(url, p);
  }
  return p;
}

function ensureLazyVideoSrc(el, onReady) {
  if (!el || !el.dataset?.src) return;
  if (el.src) {
    onReady?.();
    return;
  }
  if (el.dataset.lazyLoading) return;
  el.dataset.lazyLoading = "1";
  fetchVideoBlobUrl(el.dataset.src).then((resolved) => {
    if (!el.src) {
      el.preload = "auto";
      el.src = resolved;
    }
    onReady?.();
  });
}

function syncAmbientVideos(fo = lastFinaleO) {
  if (reduced) return;
  if (current >= 0.48) ensureLazyVideoSrc(actBeamVideoEl);
  if (finaleNeuralEl) {
    const wantFinale = fo > 0.02 && storyInView && !bridgeCovered;
    if (wantFinale) {
      if (!finalePlaying) {
        finalePlaying = true;
        ensureLazyVideoSrc(finaleNeuralEl, () => {
          if (finalePlaying) finaleNeuralEl.play().catch(() => {});
        });
      }
    } else if (finalePlaying) {
      finalePlaying = false;
      finaleNeuralEl.pause();
    }
  }
  if (actBeamEl && actBeamVideoEl) {
    const u = bridgeProgress > 0.002
      ? 0.40 + clamp(bridgeProgress, 0, 1) * 0.60
      : clamp((current - 0.90) / 0.10, 0, 1) * 0.40;
    const op = (u <= 0.01 || u >= 0.985) ? 0 : Math.sin(u * Math.PI) * 0.92;
    if (Math.abs(op - lastBeamOp) > 0.005 || (op === 0 && lastBeamOp !== 0)) {
      lastBeamOp = op;
      actBeamEl.style.opacity = op.toFixed(3);
    }
    if (op > 0.01 && actBeamVideoEl.readyState >= 2 && Number.isFinite(actBeamVideoEl.duration) && actBeamVideoEl.duration > 0.2) {
      const targetT = clamp(u, 0, 0.98) * (actBeamVideoEl.duration - 0.05);
      if (!actBeamVideoEl.seeking && Math.abs(targetT - lastBeamSeekT) >= 0.032) {
        lastBeamSeekT = targetT;
        try { actBeamVideoEl.currentTime = targetT; } catch {}
      }
    }
  }
}

if (readingNeuralEl && !reduced) {
  const readingRoot = $("#reading");
  if (readingRoot) {
    let readingVis = false;
    new IntersectionObserver((entries) => {
      readingVis = entries.some((e) => e.isIntersecting);
      if (readingVis) {
        ensureLazyVideoSrc(readingNeuralEl, () => {
          if (readingVis) readingNeuralEl.play().catch(() => {});
        });
      } else {
        readingNeuralEl.pause();
      }
    }, { rootMargin: "220px 0px", threshold: 0.005 }).observe(readingRoot);
  }
}

const st = ScrollTrigger.create({
  trigger: storyEl,
  start: "top top",
  end: () => "+=" + Math.max(1, (STORY.scrollLength - 1) * innerHeight),
  onUpdate: (self) => { target = self.progress; },
  onRefresh: (self) => { target = self.progress; }
});

// Sticky overlap bridge: #drive slides UP OVER pinned .story-stage across [5.8..6.8]*vh
if (!reduced) {
  ScrollTrigger.create({
    trigger: storyEl,
    start: () => "top+=" + Math.max(1, (STORY.scrollLength - 1) * innerHeight) + " top",
    end: () => "top+=" + STORY.scrollLength * innerHeight + " top",
    scrub: true,
    onUpdate(self) {
      const k = clamp(self.progress, 0, 1);
      bridgeProgress = k;
      bridgeCovered = k >= 0.99;
      gsap.set(stageEl, { opacity: 1 - k * 0.72, y: -k * 20, scale: 1 - k * 0.032 });
      syncAmbientVideos();
    }
  });
}

new IntersectionObserver((entries) => {
  storyInView = entries.some((e) => e.isIntersecting);
}, { rootMargin: "40px 0px" }).observe(storyEl);

function progressToY(p) {
  return st.start + p * (st.end - st.start);
}

function goToStage(i) {
  inputMode = "wheel";
  const s = STORY.stages[i];
  const p = s.from === 0 ? 0 : Math.min(s.to - 0.04, s.from + 0.048);
  const y = progressToY(p);
  if (lenis) lenis.scrollTo(y, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: "auto" });
}

/* ---------- Navigation helpers for top mode bar & finale CTA ---------- */
function wireNavLinks() {
  const navStory = $("#navStory");
  const navLive = $("#navLive");
  const navReel = $("#navReel");
  const navSpecs = $("#navSpecs");
  const cta = $("#finaleToLive");

  const smoothJump = (selector) => (e) => {
    const el = document.querySelector(selector);
    if (!el) return;
    e.preventDefault();
    inputMode = "wheel";
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(top, { duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  if (navStory) navStory.addEventListener("click", smoothJump("#story"));
  if (navLive) navLive.addEventListener("click", smoothJump("#drive"));
  if (navReel) navReel.addEventListener("click", smoothJump("#reel"));
  if (navSpecs) navSpecs.addEventListener("click", smoothJump("#reading"));
  if (cta) cta.addEventListener("click", smoothJump("#drive"));

  const updateCurrentNav = () => {
    const y = window.scrollY + innerHeight * 0.35;
    const driveTop = ($("#drive")?.offsetTop) || Infinity;
    const specsTop = ($("#reading")?.offsetTop) || Infinity;
    const reelTop = ($("#reel")?.offsetTop) || Infinity;
    const mode = y >= specsTop ? "specs" : y >= driveTop ? "live" : y >= reelTop ? "reel" : "story";
    navStory?.classList.toggle("is-current", mode === "story");
    navReel?.classList.toggle("is-current", mode === "reel");
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
  if ((!storyInView || bridgeCovered) && Math.abs(target - current) < 1e-5) return;

  // Единый smoother: Lenis сглаживает wheel, touch опирается на нативную инерцию без двойного exp-lerp.
  current = target;

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

  renderFrames(f, speedZoom, current, Math.max(0, active));
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

new ResizeObserver(() => {
  resize();
  ScrollTrigger.refresh();
}).observe(stageEl);
resize();

(async () => {
  await initFlowManifest();
  poster.src = frameURL(0);
  try {
    await preloadFrames(onProgress);
  } catch (e) {
    console.warn("story preload fallback to poster", e);
  }
  await (document.fonts?.ready || Promise.resolve()).catch(() => {});
  dirty = true;
  renderFrames(0, 1, 0);
  updateUI(current, lastF);
  ready = true;
  root.classList.add("story-ready");
  $("#preloader")?.classList.add("is-done");
  ScrollTrigger.refresh();
  window.dispatchEvent(new CustomEvent("story:ready"));

  if (FLOW_CLIPS_ENABLED && flow.hasClips && flow.clips[0]?.available) {
    setTimeout(() => waitSlotReady(0, 2500).catch(() => {}), 80);
  }
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
    videoMode: flow.hasClips,
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

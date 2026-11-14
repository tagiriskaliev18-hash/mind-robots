// Act I — Build-Story Scroll Cinema Engine (adapted from build-story-scroll-site/starter/main.js).
// Zero CDN: uses vendored GSAP + ScrollTrigger (window.gsap / window.ScrollTrigger) and local Lenis ESM.
import Lenis from "./vendor/lenis.mjs";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

export const STORY = {
  source: "frames",
  scrollLength: 9.8,
  smoothing: { wheel: 10, touch: 7.5 },
  maxFramesPerSecond: 260,
  blend: true,
  focus: { desktop: [0.58, 0.46], mobile: [0.5, 0.38] },
  sets: {
    desktop: { dir: "assets/frames/desktop/", count: 279, ext: "webp", pad: 4, w: 1920, h: 1080 },
    mobile:  { dir: "assets/frames/mobile/",  count: 173, ext: "webp", pad: 4, w: 720,  h: 1280 }
  },
  video: { desktop: "assets/film-desktop.mp4", mobile: "assets/film-mobile.mp4", fps: 30 },
  // Piecewise-linear map: scroll progress (0..1) -> film time (0..1).
  // Gentle slow-downs across each stage midpoint so every stage copy lands on its exact visual milestone; never flat.
  timeKeys: [
    [0.00, 0.000],
    [0.05, 0.062], [0.10, 0.112], [0.13, 0.143],
    [0.17, 0.258], [0.23, 0.286],
    [0.30, 0.408], [0.36, 0.429],
    [0.43, 0.550], [0.49, 0.571],
    [0.56, 0.698], [0.63, 0.714],
    [0.70, 0.840], [0.77, 0.857],
    [0.84, 0.966], [0.91, 0.990],
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
        desktop: [[0, 0.669, 0.300], [40, 0.668, 0.313], [279, 0.668, 0.313]],
        mobile:  [[0, 0.509, 0.238], [25, 0.509, 0.246], [173, 0.509, 0.246]]
      }
    },
    {
      label: "Рама Al-7075",
      show: [0.15, 0.245],
      keys: {
        desktop: [[40, 0.668, 0.313], [80, 0.668, 0.331], [279, 0.668, 0.331]],
        mobile:  [[25, 0.509, 0.246], [50, 0.509, 0.256], [173, 0.509, 0.256]]
      }
    },
    {
      label: "PMSM · 120 Н·м",
      show: [0.28, 0.375],
      keys: {
        desktop: [[80, 0.631, 0.520], [120, 0.629, 0.545], [279, 0.629, 0.545]],
        mobile:  [[50, 0.485, 0.355], [75, 0.482, 0.368], [173, 0.482, 0.368]]
      }
    },
    {
      label: "Шина 1 кГц",
      show: [0.41, 0.505],
      keys: {
        desktop: [[120, 0.668, 0.349], [160, 0.668, 0.368], [279, 0.668, 0.368]],
        mobile:  [[75, 0.509, 0.268], [100, 0.509, 0.280], [173, 0.509, 0.280]]
      }
    },
    {
      label: "3D-лидар 360°",
      show: [0.68, 0.785],
      keys: {
        desktop: [[200, 0.662, 0.200], [240, 0.615, 0.355], [279, 0.615, 0.355]],
        mobile:  [[125, 0.509, 0.175], [150, 0.525, 0.315], [173, 0.525, 0.315]]
      }
    }
  ],
  fx: { enabled: true, count: { desktop: 68, mobile: 30 }, color: [0, 245, 255], speed: 2.5 }
};

window.__STORY_STAGES = STORY.stages;

const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const storyEl = $("#story");
const stageEl = $("#storyStage");
const mediaEl = $("#media");
const canvas = $("#film");
const ctx = canvas.getContext("2d", { alpha: false });
const poster = $("#poster");
const videoEl = $("#filmVideo");
const fxCanvas = $("#fx");
const fx = fxCanvas.getContext("2d");

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
const store = {
  imgs: new Array(SET.count),
  ok: new Uint8Array(SET.count),
  loaded: 0,
  nearest(i) {
    if (this.ok[i]) return i;
    for (let d = 1; d < SET.count; d++) {
      if (i - d >= 0 && this.ok[i - d]) return i - d;
      if (i + d < SET.count && this.ok[i + d]) return i + d;
    }
    return -1;
  }
};

function loadFrame(i, attempt = 0) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.src = frameURL(i);
    const done = () => {
      store.imgs[i] = img;
      store.ok[i] = 1;
      store.loaded++;
      resolve(true);
    };
    const fail = () => {
      if (attempt < 2) {
        setTimeout(() => loadFrame(i, attempt + 1).then(resolve), 140 * (attempt + 1));
        return;
      }
      console.warn("story frame missing", i);
      resolve(false);
    };
    img.decode().then(done, () => {
      if (img.complete && img.naturalWidth) done();
      else if (img.complete) fail();
      else {
        img.onload = done;
        img.onerror = fail;
      }
    });
  });
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
      if (onEach) onEach();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
}

let dirty = true;
async function preloadFrames(onProgress) {
  const passes = preloadOrder();
  const gate = passes[0].concat(passes[1]);
  let n = 0;
  await runPool(gate, 6, () => onProgress(++n / gate.length));
  (async () => {
    for (const pass of passes.slice(2)) await runPool(pass, 4);
    dirty = true;
  })();
}

/* ---------- Canvas sizing & cover-fit ---------- */
const view = { cw: 0, ch: 0, dpr: 1, dx: 0, dy: 0, dw: 0, dh: 0, mx: 0, my: 0, sw: 0, sh: 0 };
function resize() {
  const r = mediaEl.getBoundingClientRect();
  const s = stageEl.getBoundingClientRect();
  const maxDpr = Math.max(1, (SET.w * 1.5) / Math.max(1, r.width));
  view.dpr = Math.min(window.devicePixelRatio || 1, 2, maxDpr);
  view.cw = r.width;
  view.ch = r.height;
  view.sw = s.width;
  view.sh = s.height;
  view.mx = mediaEl.offsetLeft;
  view.my = mediaEl.offsetTop;
  canvas.width = Math.round(r.width * view.dpr);
  canvas.height = Math.round(r.height * view.dpr);
  const [fxF, fyF] = STORY.focus[setName];
  const sc = Math.max(view.cw / SET.w, view.ch / SET.h);
  view.dw = SET.w * sc;
  view.dh = SET.h * sc;
  view.dx = (view.cw - view.dw) * fxF;
  view.dy = (view.ch - view.dh) * fyF;
  if (videoEl) videoEl.style.objectPosition = `${fxF * 100}% ${fyF * 100}%`;
  const fdpr = Math.min(window.devicePixelRatio || 1, 2);
  fxCanvas.width = Math.round(s.width * fdpr);
  fxCanvas.height = Math.round(s.height * fdpr);
  fx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  dirty = true;
}

function drawImg(img, alpha) {
  const d = view.dpr;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, view.dx * d, view.dy * d, view.dw * d, view.dh * d);
}

let lastDrawn = -1;
function renderFrames(f) {
  if (!dirty && Math.abs(f - lastDrawn) < 0.002) return;
  const a = Math.floor(f);
  const b = Math.min(SET.count - 1, a + 1);
  const frac = f - a;
  const ia = store.nearest(a);
  if (ia < 0) return;
  drawImg(store.imgs[ia], 1);
  if (STORY.blend && frac > 0.02 && store.ok[a] && store.ok[b] && b !== a) {
    drawImg(store.imgs[b], frac);
  }
  ctx.globalAlpha = 1;
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

function updateUI(p, f) {
  STORY.stages.forEach((s, i) => {
    const len = s.to - s.from;
    const fade = Math.min(0.24 * len, 0.035);
    let o = 0;
    let y = 24;
    if (p >= s.from && p <= s.to) {
      const inU = s.from === 0 ? 1 : clamp((p - s.from) / fade, 0, 1);
      const outU = clamp((s.to - p) / fade, 0, 1);
      if (inU < 1) {
        o = easeOut(inU);
        y = 24 * (1 - easeOut(inU));
      } else if (outU < 1) {
        o = easeOut(outU);
        y = -32 * (1 - easeOut(outU));
      } else {
        o = 1;
        y = 0;
      }
    }
    if (reduced) y = 0;
    const el = copyItems[i];
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    el.style.visibility = o > 0.001 ? "visible" : "hidden";
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
  hintEl.classList.toggle("is-hidden", !next || p > STORY.finale.from - 0.015);

  const fo = smooth(clamp((p - STORY.finale.from) / (STORY.finale.to - STORY.finale.from), 0, 1));
  finaleEl.style.opacity = fo.toFixed(3);
  finaleEl.classList.toggle("is-interactive", fo > 0.65);

  for (const { c, el } of callouts) {
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
    const [s0, s1] = c.show;
    const w = 0.014;
    const o = Math.min(smooth(clamp((p - s0) / w, 0, 1)), smooth(clamp((s1 - p) / w, 0, 1)));
    el.style.opacity = o.toFixed(3);
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

function drawFx(dFilm, dt) {
  if (!fxOn) return;
  const w = view.sw;
  const h = view.sh;
  const [r, g, b] = STORY.fx.color;
  fx.clearRect(0, 0, w, h);
  for (const m of motes) {
    m.z -= dFilm * STORY.fx.speed + dt * 0.0035;
    m.y -= dt * 0.005;
    if (m.z < 0.12 || m.y < -0.9) Object.assign(m, spawn(1));
    if (m.z > 1.05) Object.assign(m, spawn(0.02));
    const s = 0.55 / m.z;
    const px = w / 2 + m.x * s * w * 0.5 + par.x * (1 / m.z);
    const py = h / 2 + m.y * s * h * 0.5 + par.y * (1 / m.z);
    if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;
    const rad = m.r * s;
    const alpha = m.a * clamp((1.05 - m.z) * 3, 0, 1) * clamp(m.z * 4, 0, 1);
    fx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    fx.beginPath();
    fx.arc(px, py, Math.max(0.4, rad), 0, 6.283);
    fx.fill();
  }
}

/* ---------- Scroll: Lenis (wheel only) + ScrollTrigger ---------- */
storyEl.style.height = `calc(var(--vh) * ${STORY.scrollLength})`;
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true, syncTouch: false });
  lenis.on("scroll", ScrollTrigger.update);
  window.__lenis = lenis;
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
  const fade = Math.min(0.24 * (s.to - s.from), 0.035);
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
}
wireNavLinks();

/* ---------- Single GSAP ticker loop ---------- */
let ready = false;
let lastF = 0;
const stats = { maxSpeed: 0 };

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(0.05, deltaMs / 1000);
  if (lenis) lenis.raf(time * 1000);
  if (!ready) return;
  if (!storyInView && Math.abs(target - current) < 1e-4) return;

  const rate = lenis ? STORY.smoothing.wheel : STORY.smoothing.touch;
  const k = reduced ? 1 : 1 - Math.exp(-rate * dt);
  current += (target - current) * k;
  if (Math.abs(target - current) < 1e-5) current = target;

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

  renderFrames(f);
  par.x += (par.tx - par.x) * (1 - Math.exp(-4 * dt));
  par.y += (par.ty - par.y) * (1 - Math.exp(-4 * dt));
  mediaEl.style.transform = `translate3d(${par.x.toFixed(2)}px, ${par.y.toFixed(2)}px, 0)`;
  updateUI(current, f);
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
  ready = true;
  dirty = true;
  root.classList.add("story-ready");
  $("#preloader")?.classList.add("is-done");
  ScrollTrigger.refresh();
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

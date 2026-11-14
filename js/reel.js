// Act I½ — "Apollo в движении": full-screen robot clips (Google Flow) with scroll-driven cinematic transitions.
// Clips are AI-generated (may contain artifacts by owner's request). Pure DOM/CSS transforms, no extra WebGL.
const gsap = window.gsap;
const $ = (s) => document.querySelector(s);
const root = document.documentElement;

const CLIPS = [
  { id: "apollo_01", caps: "Сборка", serif: "в невесомости", sub: "Узлы Apollo слетаются к силовому каркасу и встают на свои места.", trans: "zoom" },
  { id: "apollo_02", caps: "Снизу", serif: "вверх", sub: "Линейные приводы ног поднимают торс, плечевой пояс и голову.", trans: "beam" },
  { id: "apollo_03", caps: "Скелет", serif: "в панцирь", sub: "Тёмная силовая рама закрывается жемчужно-белыми панелями.", trans: "iris" },
  { id: "apollo_04", caps: "Первый", serif: "взгляд", sub: "Лицевая панель оживает: стереокамеры и LED-полоса речи.", trans: "glitch" },
  { id: "apollo_05", caps: "На", serif: "подиуме", sub: "Готовый Apollo ростом 1,73 м выходит в луч света.", trans: "curtain" },
  { id: "apollo_06", caps: "Привет,", serif: "мир", sub: "Apollo машет рукой и делает первый шаг. Дальше — живой 3D-стенд.", trans: "handoff" }
];
const N = CLIPS.length;
const HOLD = 0.5;                 // part of each scroll unit where the clip is shown clean
const DIR = "assets/video/reel/";

const reelEl = $("#reel");
const stageEl = $("#reelStage");
const layersEl = $("#reelLayers");
const reduced = root.classList.contains("is-still");
const mobile = matchMedia("(max-width: 820px), (max-aspect-ratio: 1/1)").matches;
const useBlur = !mobile;

if (reelEl && stageEl && layersEl && gsap) init();

function init() {
  // sticky range = (N-1) transitions + last hold + 1 unit of overlap with #drive
  const units = (N - 1) + HOLD + 1;
  reelEl.style.height = `calc(var(--vh) * ${units + 1})`;
  const beamVideo = $("#reelBeam");
  const flashEl = $("#reelFlash");
  const edgeEl = $("#reelEdge");
  const ringEl = $("#reelRing");
  const scanEl = $("#reelScan");
  const copyEl = $("#reelCopy");
  const countEl = $("#reelCount");
  const segsEl = $("#reelSegs");
  const exitEl = $("#reelExit");

  const layers = CLIPS.map((c, i) => {
    const wrap = document.createElement("div");
    wrap.className = "reel-layer";
    wrap.dataset.idx = i;
    const fill = document.createElement("div");
    fill.className = "reel-fill";
    fill.style.backgroundImage = `url(${DIR}${c.id}.webp)`;
    wrap.appendChild(fill);
    const v = document.createElement("video");
    v.className = "reel-video";
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.preload = "none";
    v.poster = `${DIR}${c.id}.webp`;
    v.dataset.src = `${DIR}${c.id}${mobile ? "_m" : ""}.mp4`;
    v.setAttribute("aria-hidden", "true");
    wrap.appendChild(v);
    layersEl.appendChild(wrap);
    return { wrap, v, loaded: false, playing: false, shown: false, i };
  });

  const segs = CLIPS.map((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reel-seg";
    b.setAttribute("aria-label", `Ролик ${i + 1}: ${c.caps} ${c.serif}`);
    b.innerHTML = "<i></i>";
    b.addEventListener("click", () => goTo(i));
    segsEl.appendChild(b);
    return b;
  });

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function load(L) {
    if (L.loaded) return;
    L.loaded = true;
    L.v.preload = "auto";
    L.v.src = L.v.dataset.src;
  }
  function setPlay(L, on) {
    if (on) {
      load(L);
      if (!L.playing) {
        L.playing = true;
        const p = L.v.play();
        if (p && p.catch) p.catch(() => { L.playing = false; });
      }
    } else if (L.playing) {
      L.playing = false;
      L.v.pause();
    }
  }

  const vhPx = () => stageEl.clientHeight || innerHeight;
  function reelTop() {
    return reelEl.getBoundingClientRect().top + scrollY;
  }
  function goTo(i) {
    const y = reelTop() + (i + 0.12) * vhPx();
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else scrollTo({ top: y, behavior: "smooth" });
  }

  let copyIdx = -1;
  function setCopy(i) {
    if (i === copyIdx) return;
    copyIdx = i;
    const c = CLIPS[i];
    copyEl.innerHTML = `<p class="reel-copy__kicker">APOLLO В ДВИЖЕНИИ · РОЛИК ${String(i + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}</p>` +
      `<h2 class="reel-copy__title"><span class="caps">${c.caps}</span><em>${c.serif}</em></h2>` +
      `<p class="reel-copy__sub">${c.sub}</p>`;
    countEl.innerHTML = `${String(i + 1).padStart(2, "0")}<span>/${String(N).padStart(2, "0")}</span>`;
    segs.forEach((b, k) => b.classList.toggle("is-active", k === i));
  }

  const S = (L, o) => {
    const st = L.wrap.style;
    st.opacity = (o.opacity ?? 1).toFixed(3);
    st.transform = o.transform || "none";
    st.filter = o.filter || "none";
    st.clipPath = o.clip || "none";
    st.webkitClipPath = o.clip || "none";
    st.zIndex = String(o.z ?? 1);
    st.visibility = "visible";
  };
  const hide = (L) => {
    if (!L.shown) return;
    L.shown = false;
    L.wrap.style.visibility = "hidden";
    setPlay(L, false);
  };
  const blur = (px) => (useBlur && px > 0.15 ? ` blur(${px.toFixed(1)}px)` : "");

  let beamOn = false;
  function overlays({ beam = 0, beamT = 0, flash = 0, edge = null, ring = null, scan = 0 } = {}) {
    flashEl.style.opacity = flash.toFixed(3);
    scanEl.style.opacity = scan.toFixed(3);
    if (beam > 0.01) {
      if (!beamOn) {
        beamOn = true;
        if (!beamVideo.src) { beamVideo.preload = "auto"; beamVideo.src = beamVideo.dataset.src; }
      }
      beamVideo.style.opacity = beam.toFixed(3);
      if (beamVideo.readyState >= 2 && Number.isFinite(beamVideo.duration) && !beamVideo.seeking) {
        const t = clamp(beamT, 0, 0.98) * beamVideo.duration;
        if (Math.abs(beamVideo.currentTime - t) > 0.04) beamVideo.currentTime = t;
      }
    } else if (beamOn) {
      beamOn = false;
      beamVideo.style.opacity = "0";
    }
    if (edge) {
      edgeEl.style.opacity = edge.o.toFixed(3);
      edgeEl.style.transform = edge.t;
      edgeEl.dataset.dir = edge.dir;
    } else edgeEl.style.opacity = "0";
    if (ring) {
      ringEl.style.opacity = ring.o.toFixed(3);
      ringEl.style.transform = `translate(-50%, -50%) scale(${ring.s.toFixed(4)})`;
    } else ringEl.style.opacity = "0";
  }

  function transition(type, u, A, B) {
    const e = easeIO(u);
    const pulse = Math.sin(u * Math.PI);
    const W = stageEl.clientWidth, H = stageEl.clientHeight;
    switch (type) {
      case "zoom": {
        S(A, { z: 1, opacity: 1 - sstep(0.45, 0.95, u), transform: `scale(${(1 + 0.55 * e).toFixed(4)})`, filter: `brightness(${(1 + 0.6 * pulse).toFixed(3)})${blur(16 * e)}` });
        S(B, { z: 2, opacity: sstep(0.25, 0.7, u), transform: `scale(${(1.28 - 0.28 * e).toFixed(4)})`, filter: `brightness(${(1 + 0.5 * pulse).toFixed(3)})${blur(12 * (1 - e))}` });
        overlays({ flash: Math.pow(pulse, 3) * 0.55, beam: pulse * 0.55, beamT: u });
        break;
      }
      case "beam": {
        const x = -25 + 150 * e; // wipe edge in %
        S(A, { z: 1, transform: `scale(${(1 + 0.08 * e).toFixed(4)}) translateX(${(-3 * e).toFixed(2)}%)`, filter: `brightness(${(1 - 0.35 * e).toFixed(3)})` });
        S(B, { z: 2, clip: `polygon(0 0, ${x + 12}% 0, ${x - 12}% 100%, 0 100%)`, transform: `scale(${(1.08 - 0.08 * e).toFixed(4)})` });
        overlays({ beam: pulse * 0.95, beamT: u, edge: { o: pulse, t: `translateX(${(x / 100 * W).toFixed(1)}px) skewX(${(-Math.atan2(0.24 * W, H) * 180 / Math.PI).toFixed(2)}deg)`, dir: "v" }, flash: pulse * 0.12 });
        break;
      }
      case "iris": {
        const R = 78 * e; // % of reference radius
        const diag = Math.hypot(W, H) / Math.SQRT2;
        S(A, { z: 1, transform: `scale(${(1 + 0.16 * e).toFixed(4)}) rotate(${(-2 * e).toFixed(2)}deg)`, filter: `brightness(${(1 - 0.4 * e).toFixed(3)})${blur(7 * e)}` });
        S(B, { z: 2, clip: `circle(${R.toFixed(2)}% at 50% 46%)`, transform: `scale(${(1.18 - 0.18 * e).toFixed(4)})` });
        const rPx = (R / 100) * diag;
        overlays({ ring: { o: pulse * (u < 0.98 ? 1 : 0), s: (2 * rPx) / 1000 }, beam: pulse * 0.4, beamT: u, flash: pulse * 0.08 });
        break;
      }
      case "glitch": {
        const step = Math.floor(u * 26);
        const rnd = (n) => { const x = Math.sin((step + 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        const shown = u > 0.62 || (u > 0.18 && rnd(1) > 0.45);
        const jit = pulse * (rnd(2) - 0.5) * 60;
        const bandTop = rnd(3) * 70, bandH = 8 + rnd(4) * 30;
        S(A, { z: 1, opacity: u > 0.8 ? 1 - sstep(0.8, 1, u) : 1, transform: `translateX(${(-jit * 0.6).toFixed(1)}px) scale(${(1 + 0.04 * pulse).toFixed(4)})`, filter: `saturate(${(1 + 1.4 * pulse).toFixed(2)}) hue-rotate(${(pulse * 40 * (rnd(5) - 0.5)).toFixed(1)}deg) contrast(${(1 + 0.4 * pulse).toFixed(2)})` });
        S(B, { z: 2, opacity: shown ? 1 : (u > 0.18 ? 0.35 : 0), clip: u > 0.7 ? "none" : `inset(${bandTop.toFixed(1)}% 0 ${Math.max(0, 100 - bandTop - bandH - u * 120).toFixed(1)}% 0)`, transform: `translateX(${jit.toFixed(1)}px)`, filter: `saturate(${(1 + pulse).toFixed(2)}) contrast(${(1 + 0.3 * pulse).toFixed(2)})` });
        overlays({ scan: pulse * 0.9, flash: rnd(6) > 0.82 ? pulse * 0.35 : 0 });
        break;
      }
      case "curtain": {
        const top = 100 - 100 * e;
        S(A, { z: 1, transform: `translateY(${(-5 * e).toFixed(2)}%) scale(${(1 + 0.05 * e).toFixed(4)})`, filter: `brightness(${(1 - 0.45 * e).toFixed(3)})${blur(5 * e)}` });
        S(B, { z: 2, clip: `inset(${top.toFixed(2)}% 0 0 0)`, transform: `translateY(${(4 * (1 - e)).toFixed(2)}%)` });
        overlays({ beam: pulse * 0.7, beamT: 1 - u, edge: { o: pulse, t: `translateY(${((top / 100) * H).toFixed(1)}px)`, dir: "h" }, flash: pulse * 0.1 });
        break;
      }
    }
  }

  let lastS = NaN;
  let near = false;
  new IntersectionObserver((ents) => {
    near = ents.some((x) => x.isIntersecting);
    if (!near) layers.forEach(hide);
    else lastS = NaN;
  }, { rootMargin: "150% 0px" }).observe(reelEl);

  function render() {
    if (!near) return;
    const vh = vhPx();
    const s = -reelEl.getBoundingClientRect().top / vh;
    if (Math.abs(s - lastS) < 0.0004) return;
    lastS = s;
    root.classList.toggle("reel-on", s > -0.5 && s < units - 0.3);

    const active = new Set();
    // Entry: reel slides over Act I while clip 01 zooms in out of the light
    if (s < 0) {
      const e = smooth(clamp(1 + s, 0, 1));
      const L = layers[0];
      L.shown = true;
      active.add(0);
      S(L, { z: 1, transform: `scale(${(1.32 - 0.32 * e).toFixed(4)})`, filter: `brightness(${(0.5 + 0.5 * e + 0.6 * Math.sin(e * Math.PI)).toFixed(3)})${blur(14 * (1 - e))}` });
      overlays({ beam: Math.sin(e * Math.PI) * 0.6, beamT: e * 0.5, flash: Math.pow(Math.sin(e * Math.PI), 4) * 0.25 });
      copyEl.style.opacity = sstep(0.55, 0.95, e).toFixed(3);
      copyEl.style.transform = `translateY(${(18 * (1 - e)).toFixed(1)}px)`;
      setCopy(0);
      setProgress(0, 0);
      exitEl.style.opacity = "0";
      if (s > -1.6) load(layers[1]);
    } else {
      const k = clamp(Math.floor(s), 0, N - 1);
      const frac = s - k;
      if (k < N - 1 && frac > HOLD) {
        const u = clamp((frac - HOLD) / (1 - HOLD), 0, 1);
        const A = layers[k], B = layers[k + 1];
        A.shown = B.shown = true;
        active.add(k); active.add(k + 1);
        transition(CLIPS[k].trans, u, A, B);
        const ci = u < 0.5 ? k : k + 1;
        setCopy(ci);
        copyEl.style.opacity = (1 - Math.sin(u * Math.PI)).toFixed(3);
        copyEl.style.transform = `translateY(${(u < 0.5 ? -14 * Math.sin(u * Math.PI) : 14 * Math.sin(u * Math.PI)).toFixed(1)}px)`;
        setProgress(k, frac);
        exitEl.style.opacity = "0";
      } else {
        const L = layers[k];
        L.shown = true;
        active.add(k);
        const ex = k === N - 1 ? clamp((s - (N - 1 + HOLD)) / 1, 0, 1) : 0;
        if (ex > 0) {
          // Handoff to the live 3D stand: clip recedes into a cyan scan while #drive slides over it
          const e = easeIO(ex);
          S(L, { z: 1, transform: `scale(${(1 - 0.1 * e).toFixed(4)})`, filter: `brightness(${(1 - 0.55 * e).toFixed(3)}) saturate(${(1 - 0.6 * e).toFixed(2)})${blur(6 * e)}` });
          overlays({ scan: Math.sin(ex * Math.PI) * 0.8, ring: { o: Math.sin(ex * Math.PI) * 0.9, s: (0.25 + 1.6 * e) * Math.min(stageEl.clientWidth, stageEl.clientHeight) / 1000 } });
          exitEl.style.opacity = Math.sin(clamp(ex * 1.3, 0, 1) * Math.PI).toFixed(3);
          copyEl.style.opacity = (1 - sstep(0, 0.4, ex)).toFixed(3);
        } else {
          S(L, { z: 1 });
          overlays();
          exitEl.style.opacity = "0";
          copyEl.style.opacity = "1";
        }
        copyEl.style.transform = "none";
        setCopy(k);
        setProgress(k, Math.min(frac, HOLD) / 1);
        if (frac > 0.1 && k + 1 < N) load(layers[k + 1]);
      }
    }
    layers.forEach((L, i) => {
      if (active.has(i)) setPlay(L, true);
      else hide(L);
    });
  }

  function setProgress(k, frac) {
    segs.forEach((b, i) => {
      const f = i < k ? 1 : i > k ? 0 : clamp(frac / 1, 0, 1);
      b.style.setProperty("--f", f.toFixed(3));
    });
  }

  if (reduced) {
    layers.forEach((L, i) => { L.wrap.style.visibility = i === 0 ? "visible" : "hidden"; });
    setCopy(0);
    return;
  }
  gsap.ticker.add(render);
  addEventListener("resize", () => { lastS = NaN; }, { passive: true });

  window.__reel = {
    state: () => ({ s: Number.isFinite(lastS) ? +lastS.toFixed(3) : null, playing: layers.filter((l) => l.playing).map((l) => l.i), ready: layers.map((l) => l.v.readyState) }),
    top: reelTop,
    goTo,
    units
  };

  // ---- Act II -> Паспорт: robot clip hero at the top of #reading with an iris/scan reveal ----
  const hero = $("#readingHero");
  const heroV = $("#readingHeroVideo");
  if (hero && heroV) {
    heroV.dataset.src = `${DIR}apollo_05${mobile ? "_m" : ""}.mp4`;
    let heroNear = false;
    new IntersectionObserver((ents) => {
      heroNear = ents.some((x) => x.isIntersecting);
      if (heroNear) {
        if (!heroV.src) { heroV.preload = "auto"; heroV.src = heroV.dataset.src; }
        heroV.play().catch(() => {});
      } else heroV.pause();
    }, { rootMargin: "60% 0px" }).observe(hero);
    gsap.ticker.add(() => {
      if (!heroNear) return;
      const r = hero.getBoundingClientRect();
      const q = clamp(1 - (r.top - innerHeight * 0.15) / (innerHeight * 0.85), 0, 1);
      const e = easeIO(q);
      hero.style.setProperty("--q", e.toFixed(3));
    });
  }
}

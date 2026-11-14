import * as THREE from "three";
import { PRODUCT, HERO, INTRO, TABS, MOTION, QUALITY } from "./config.js";
import { createStage, isPhone } from "./stage.js";
import { makeMaterials, loadModel, placeholderModel, addLamp } from "./model.js";
import { springStep, setGoals, settleError, fitExploded } from "./explode.js";
import { createRig } from "./rig.js";
import { createCallouts } from "./callouts.js";
import { createTitle } from "./title.js";

const still = document.documentElement.classList.contains("is-still");
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const $ = (id) => document.getElementById(id);

const app = { mode: "loading", tab: -1, since: 0, label: 0, err: 1, fps: 0, parts: [], lamps: [], errors: [], stage: null };
window.__mind = app; // хук для critic-скрипта

// Экранные прямоугольники деталей внутри .live-pin — critic проверяет, что карточки не лежат на объекте.
app.partRects = () => {
  if (!camera || !app.parts.length) return [];
  const pin = $("livePin")?.getBoundingClientRect() || { left: 0, top: 0 };
  return app.parts.map((p) => {
    const b = p.mesh.geometry.boundingBox;
    const r = { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity };
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
        .add(p.mesh.position)
        .project(camera);
      const x = pin.left + (v.x * 0.5 + 0.5) * innerWidth;
      const y = pin.top + (-v.y * 0.5 + 0.5) * innerHeight;
      r.x = Math.min(r.x, x);
      r.y = Math.min(r.y, y);
      r.r = Math.max(r.r, x);
      r.b = Math.max(r.b, y);
    }
    return r;
  });
};
addEventListener("error", (e) => app.errors.push(String(e.message)));

let stage = null, scene = null, camera = null, rig = null, title = null, mats = null, callouts = null;
function initStage() {
  if (stage) return;
  stage = createStage($("stage"));
  app.stage = stage;
  ({ scene, camera } = stage);
  rig = createRig(camera, $("stage"), still);
  title = createTitle(scene, gsap, still);
  mats = makeMaterials();
  callouts = createCallouts({
    els: [$("c0"), $("c1"), $("c2")],
    svg: $("leaders"),
    isPhone,
    getSafe: () => ({
      top: Math.round($("tabs").offsetTop + $("tabs").offsetHeight + (isPhone() ? 14 : innerHeight * 0.06)),
      bottom: innerHeight - 78
    })
  });
}

function syncLampHalos() {
  if (!mats) return;
  const op = 0.72 * Math.min(1, mats.led.emissiveIntensity / (QUALITY.ledEmissive || 1));
  for (const l of app.lamps) {
    if (l.userData.halo) l.userData.halo.material.opacity = op;
  }
}

// ---------- tabs + scroll: одна дорожка в Акте II, одна камера ----------
const tabsEl = $("tabs");
TABS.forEach((t, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.tab = i;
  b.textContent = t.label;
  b.setAttribute("aria-pressed", "false");
  tabsEl.append(b);
});
$("drive").style.height = (TABS.length + 2) * 100 + "svh";
let scrollLock = false;
let liveInView = false;
let introPending = false;
let bootStarted = false;
let bootPromise = null;
let ensureBoot = () => {};
let glbBufferPromise = null;
let rafId = null;
let lastCamSig = NaN;
let lastCoordsStr = "";

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function prefetchGlbBuffer() {
  if (glbBufferPromise || !PRODUCT.glb) return glbBufferPromise;
  glbBufferPromise = fetch(PRODUCT.glb)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  return glbBufferPromise;
}

function wakeLoop() {
  if (!rafId) {
    prev = performance.now();
    fpsAcc = 0;
    fpsN = 0;
    rafId = requestAnimationFrame(tick);
  }
}

function setNavActive(id) {
  for (const k of ["navStory", "navLive", "navSpecs"]) {
    const el = $(k);
    if (el) el.classList.toggle("is-current", k === id);
  }
}

new IntersectionObserver((entries) => {
  const wasInView = liveInView;
  liveInView = entries.some((e) => e.isIntersecting);
  window.dispatchEvent(new CustomEvent("mind:live", { detail: { active: liveInView } }));
  if (liveInView) {
    ensureBoot();
    if (!wasInView && introPending && app.parts.length) {
      const nearTop = scrollY < $("drive").offsetTop + innerHeight * 0.48;
      introPending = false;
      if (nearTop) animateIntroEntrance();
      else {
        mats.led.emissiveIntensity = QUALITY.ledEmissive;
        syncLampHalos();
      }
    }
    wakeLoop();
  }
}, { rootMargin: "0px", threshold: 0.01 }).observe($("drive"));

new IntersectionObserver((entries) => {
  if (entries.some((e) => e.isIntersecting)) ensureBoot();
}, { rootMargin: "260px 0px", threshold: 0.001 }).observe($("drive"));

$("stage")?.addEventListener("pointerdown", wakeLoop, { passive: true });
$("stage")?.addEventListener("wheel", wakeLoop, { passive: true });
addEventListener("stage:dirty", () => { if (liveInView) wakeLoop(); });
addEventListener("resize", () => { if (liveInView) wakeLoop(); }, { passive: true });

function scrollToProgress(p, immediate = false) {
  const drive = $("drive");
  const base = drive.offsetTop;
  const max = Math.max(1, TABS.length * innerHeight);
  const dest = base + p * max;
  if (immediate || still || !gsap) {
    if (window.__lenis) window.__lenis.scrollTo(dest, { immediate: true });
    else scrollTo(0, dest);
    if (ScrollTrigger) ScrollTrigger.update();
    return;
  }
  scrollLock = true;
  if (window.__lenis) {
    window.__lenis.scrollTo(dest, {
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      onComplete: () => { scrollLock = false; }
    });
    setTimeout(() => { scrollLock = false; }, 950);
  } else {
    gsap.to(document.documentElement, {
      scrollTop: dest,
      duration: 0.9,
      ease: "expo.out",
      onComplete: () => { scrollLock = false; }
    });
  }
}

function findPart(token) {
  return (
    app.parts.find((p) => p.name === token) ||
    app.parts.find((p) => p.name.startsWith(token)) ||
    app.parts.find((p) => p.group === token)
  );
}

function enterHero(fromScroll) {
  initStage();
  app.mode = "hero";
  app.tab = -1;
  app.since = 0;
  rig.setTarget(HERO, isPhone(), isPhone() ? (HERO.phoneRadius ?? 1.18) : 1);
  setGoals(app.parts, null);
  callouts.hide();
  title.set(true);
  $("hud-index").textContent = "";
  tabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  wakeLoop();
  if (!fromScroll) scrollToProgress(0);
}

app.scrollToLiveHero = () => {
  initStage();
  ensureBoot();
  liveInView = true;
  introPending = false;
  scrollToProgress(0, true);
  if (app.parts.length) enterHero(true);
  mats.led.emissiveIntensity = QUALITY.ledEmissive;
  syncLampHalos();
  stage.render(0.016);
  wakeLoop();
};

function bindScroll() {
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const pinEl = $("livePin");
  if (pinEl) gsap.set(pinEl, { opacity: 1, y: 0, scale: 1 });

  ScrollTrigger.create({
    trigger: "#drive",
    start: "top top",
    end: () => "+=" + TABS.length * innerHeight,
    onUpdate(self) {
      if (scrollLock || app.mode === "intro") return;
      if (self.isActive) setNavActive("navLive");
      const idx = Math.round(self.progress * TABS.length) - 1;
      if (idx < 0) {
        if (app.mode !== "hero") enterHero(true);
        return;
      }
      if (app.tab !== idx) applyTab(idx, true);
    }
  });

  // Sticky overlap bridge: #reading slides UP OVER pinned #livePin as #livePin recedes cleanly.
  if (pinEl && !still) {
    ScrollTrigger.create({
      trigger: "#drive",
      start: () => "top+=" + TABS.length * innerHeight + " top",
      end: () => "top+=" + (TABS.length + 1) * innerHeight + " top",
      scrub: true,
      onUpdate(self) {
        const k = Math.max(0, Math.min(1, self.progress));
        gsap.set(pinEl, { opacity: 1 - k * 0.72, y: -k * 20, scale: 1 - k * 0.032 });
        if (k > 0.45) setNavActive("navSpecs");
        else if (liveInView) setNavActive("navLive");
      }
    });
  }
}

function applyTab(i, fromScroll) {
  initStage();
  const tab = TABS[i];
  if (app.mode === "hero" || app.mode === "intro") title.set(false);
  app.mode = "tab";
  app.tab = i;
  app.since = 0;
  app.label = 0;
  liveInView = true;
  setGoals(app.parts, tab, isPhone());
  if (tab.fit) fitExploded(app.parts, camera, tab, isPhone());
  const phoneMul = isPhone() ? (tab.phoneRadius ?? 1.18) : 1;
  rig.setTarget(tab, isPhone(), phoneMul);
  callouts.show(tab.calls, findPart);
  $("hud-index").innerHTML = String(i + 1).padStart(2, "0") + `<span>/${String(TABS.length).padStart(2, "0")}</span>`;
  tabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.tab) === i)));
  wakeLoop();
  if (!fromScroll) scrollToProgress((i + 1) / TABS.length);
}

tabsEl.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && app.mode !== "loading") applyTab(Number(b.dataset.tab), false);
});

addEventListener("keydown", (e) => {
  if (app.mode === "loading" || !liveInView) return;
  if (e.key === "ArrowRight") applyTab(Math.min(TABS.length - 1, app.tab + 1), false);
  if (e.key === "ArrowLeft") app.tab <= 0 ? enterHero(false) : applyTab(app.tab - 1, false);
  if (e.key === "Escape") enterHero(false);
});

function bindOldPlaceholderRemoved() {} // Scroll binding defined above app.scrollToLiveHero

function animateIntroEntrance() {
  const heroPhoneMul = isPhone() ? (HERO.phoneRadius ?? 1.18) : 1;
  app.mode = "intro";
  wakeLoop();
  const s = rig.state;
  s.locked = true;
  Object.assign(s, { radius: INTRO.radius, phi: INTRO.phi, theta: INTRO.theta });
  s.look.fromArray(INTRO.look);
  rig.setTarget(HERO, isPhone(), heroPhoneMul);
  mats.led.emissiveIntensity = 0;
  syncLampHalos();
  const look = { x: INTRO.look[0], y: INTRO.look[1], z: INTRO.look[2] };
  const targetR = s.target.radius;
  const targetLook = s.target.look.clone();
  gsap.timeline({
    onComplete: () => {
      s.locked = false;
      app.mode = "hero";
      syncLampHalos();
      stage.render(0.016);
      bindScroll();
    }
  })
    .to(s, { radius: targetR, phi: HERO.phi, theta: HERO.theta, duration: INTRO.duration, ease: "expo.inOut" }, 0)
    .to(look, {
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      duration: INTRO.duration,
      ease: "expo.inOut",
      onUpdate: () => s.look.set(look.x, look.y, look.z)
    }, 0)
    .to(mats.led, { emissiveIntensity: QUALITY.ledEmissive, duration: 0.85, ease: "power2.out", onUpdate: syncLampHalos }, 0.65)
    .add(() => title.set(true), 0.95)
    .fromTo("#hud", { opacity: 0.01 }, { opacity: 1, duration: 0.75, ease: "power2.out" }, 0.85);
}

// ---------- intro: готовность 3D-сцены к моменту входа в Акт II ----------
function playIntro() {
  document.documentElement.classList.add("is-ready");
  const heroPhoneMul = isPhone() ? (HERO.phoneRadius ?? 1.18) : 1;
  if (still || !gsap) {
    rig.state.locked = false;
    rig.setTarget(HERO, isPhone(), heroPhoneMul);
    Object.assign(rig.state, { radius: rig.state.target.radius, phi: HERO.phi, theta: HERO.theta });
    rig.state.look.copy(rig.state.target.look);
    rig.update(0.016);
    app.mode = "hero";
    app.tab = -1;
    app.since = 0;
    app.err = 0;
    setGoals(app.parts, null);
    callouts.hide();
    title.set(true);
    mats.led.emissiveIntensity = QUALITY.ledEmissive;
    syncLampHalos();
    stage.render(0.016);
    bindScroll();
    return;
  }
  if (!liveInView) {
    // Заранее готовим камеру на входной точке INTRO и ждём реального появления #drive в кадре
    introPending = true;
    rig.state.locked = false;
    rig.setTarget(INTRO, isPhone(), 1);
    Object.assign(rig.state, { radius: INTRO.radius, phi: INTRO.phi, theta: INTRO.theta });
    rig.state.look.fromArray(INTRO.look);
    rig.update(0.016);
    app.mode = "hero";
    app.tab = -1;
    app.since = 0;
    app.err = 0;
    setGoals(app.parts, null);
    callouts.hide();
    title.set(false);
    mats.led.emissiveIntensity = 0;
    syncLampHalos();
    stage.render(0.016);
    bindScroll();
    return;
  }
  animateIntroEntrance();
}

// ---------- boot ----------
async function boot() {
  initStage();
  await nextFrame();
  let model;
  try {
    if (!PRODUCT.glb) throw new Error("no glb");
    const buf = glbBufferPromise ? await glbBufferPromise : null;
    model = await loadModel(buf || PRODUCT.glb, stage.renderer, mats, (f) => {
      if ($("loader-bar")) $("loader-bar").style.width = Math.round(f * 70) + "%";
    }, still);
  } catch (err) {
    console.warn("model: placeholder", err.message);
    model = placeholderModel(mats);
  }
  if (!still) await nextFrame();
  scene.add(model.root);
  app.parts = model.parts;

  const box = new THREE.Box3().setFromObject(model.root);
  app.floorY = box.min.y + 0.003;
  stage.catcher.position.y = app.floorY;
  stage.shadowLight.position.set(-0.14, app.floorY + 6.4, 0.18);
  stage.shadowLight.target.position.set(0, app.floorY, 0);

  const anchor = (part, wx, wy, wz) => part
    ? [wx - part.centerLocal.x, wy - part.centerLocal.y, wz - part.centerLocal.z]
    : [wx, wy, wz];
  const facePart = findPart("head_faceplate") || findPart("head_visor_glass") || findPart("head_link");
  if (facePart) {
    const fb = facePart.mesh.geometry.boundingBox;
    const fx = fb.max.x + 0.002;
    // Короткий выразительный LED-индикатор речи в нижней части светлой лицевой панели Apollo 2
    addLamp(app.lamps, scene, facePart, anchor(facePart, fx, 1.560, 0), new THREE.CapsuleGeometry(0.0022, 0.030, 6, 14), mats.led, [Math.PI / 2, 0, 0], 0.072);
  }
  const chestOled = findPart("logo_chest_ui") || findPart("logo_link") || findPart("torso_link");
  if (chestOled) {
    const cb = chestOled.mesh.geometry.boundingBox;
    // Тонкий активный индикатор под нагрудной камерой (не перекрывает статус-интерфейс 123/NET/BAT)
    addLamp(app.lamps, scene, chestOled, anchor(chestOled, cb.max.x + 0.002, 1.292, 0), new THREE.CapsuleGeometry(0.0018, 0.044, 6, 14), mats.led, [Math.PI / 2, 0, 0], 0.068);
  }
  const jointRing = new THREE.TorusGeometry(0.015, 0.0018, 12, 32);
  for (const [token, sign] of [["left_elbow_link", -1], ["right_elbow_link", 1]]) {
    const ep = findPart(token);
    if (ep) {
      const eb = ep.mesh.geometry.boundingBox;
      const zOut = sign < 0 ? eb.min.z - 0.0015 : eb.max.z + 0.0015;
      addLamp(app.lamps, scene, ep, anchor(ep, ep.centerLocal.x, ep.centerLocal.y, zOut), jointRing, mats.led, [0, 0, 0], 0.07);
    }
  }

  if ($("loader-bar")) $("loader-bar").style.width = "100%";
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  if (!still) await nextFrame();
  stage.renderer.compile(scene, camera);
  if (!still) await nextFrame();
  playIntro();
}

// ---------- loop ----------
let prev = performance.now();
let fpsAcc = 0;
let fpsN = 0;

function tick(now) {
  rafId = null;
  const raw = (now - prev) / 1000;
  const dt = Math.min(0.033, Math.max(0.001, raw));
  prev = now;

  // Completely halt Act II WebGL RAF whenever #drive is offscreen (during #story or #reading)
  if (!liveInView && app.mode !== "intro") {
    return;
  }

  fpsAcc += raw;
  fpsN++;
  if (fpsAcc > 0.5) {
    app.fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0;
    fpsN = 0;
  }
  app.since += dt;
  for (const p of app.parts) springStep(p, dt, still);
  const haloOp = mats ? 0.72 * Math.min(1, mats.led.emissiveIntensity / (QUALITY.ledEmissive || 1)) : 0.72;
  for (const l of app.lamps) {
    const p = l.userData.part;
    l.position.copy(p.mesh.position).add(p.centerLocal).add(l.userData.local);
    if (l.userData.halo) l.userData.halo.material.opacity = haloOp;
  }
  const camErr = rig.update(dt);
  title.update(camera, HERO.look[1] + 0.11, isPhone());
  app.titleVisible = title.visible;
  app.err = camErr + settleError(app.parts);
  const camSig = camera.position.x + camera.position.y * 13 + camera.position.z * 31 + camera.quaternion.x * 53 + camera.quaternion.y * 79;
  const moved = Math.abs(camSig - lastCamSig) > 1e-4 || app.err > 0.0015 || app.since < 2.2;
  lastCamSig = camSig;

  if (app.mode === "tab") {
    const want = app.err < MOTION.labelShowError || app.since > MOTION.labelShowAfter ? 1 : 0;
    const nextLabel = still ? 1 : app.label + (want - app.label) * (1 - Math.exp(-MOTION.labelLambda * dt));
    const labelChanged = Math.abs(nextLabel - app.label) > 0.001;
    app.label = nextLabel;
    if (moved || labelChanged) {
      callouts.update(camera, title.visible ? 0 : app.label);
    }
  }
  if (moved) {
    const p = camera.position;
    const cs = `X ${p.x.toFixed(2)} · Y ${p.y.toFixed(2)} · Z ${p.z.toFixed(2)}`;
    if (cs !== lastCoordsStr) {
      lastCoordsStr = cs;
      $("hud-coords").textContent = cs;
    }
  }
  stage.render(dt);
  app.triangles = stage.renderer.info.render.triangles;
  stage.adapt(dt);

  const labelSettled = app.mode !== "tab" || Math.abs((app.err < MOTION.labelShowError || app.since > MOTION.labelShowAfter ? 1 : 0) - app.label) < 0.002;
  if (app.mode !== "intro" && !moved && app.err < 0.0008 && labelSettled && app.since >= 1.6) {
    return;
  }
  rafId = requestAnimationFrame(tick);
}

// Предзагрузка бинарного GLB в фоне (0 мс WebGL), а компиляция Act II только при простое или подходе к #drive
function scheduleBoot() {
  ensureBoot = () => {
    if (bootStarted) return bootPromise;
    bootStarted = true;
    bootPromise = boot().catch((err) => {
      console.error(err);
      $("fail").hidden = false;
    });
    return bootPromise;
  };
  if (still || liveInView) {
    ensureBoot();
    return;
  }

  let lastScrollTs = performance.now();
  let idleTimer = null;
  const markScroll = () => { lastScrollTs = performance.now(); };
  addEventListener("wheel", markScroll, { passive: true });
  addEventListener("touchmove", markScroll, { passive: true });
  addEventListener("scroll", () => {
    markScroll();
    const driveEl = $("drive");
    if (driveEl && scrollY >= driveEl.offsetTop - innerHeight * 1.18) ensureBoot();
  }, { passive: true });

  function waitIdleBoot() {
    if (bootStarted) return;
    const since = performance.now() - lastScrollTs;
    if (since >= 950 && document.visibilityState === "visible") {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 16));
      idle(() => {
        if (!bootStarted && performance.now() - lastScrollTs >= 900) ensureBoot();
        else if (!bootStarted) idleTimer = setTimeout(waitIdleBoot, 500);
      });
    } else {
      idleTimer = setTimeout(waitIdleBoot, Math.max(350, 950 - since));
    }
  }

  const onStoryReady = () => {
    prefetchGlbBuffer();
    idleTimer = setTimeout(waitIdleBoot, 950);
  };
  if (window.__story?.state()?.ready) onStoryReady();
  else addEventListener("story:ready", onStoryReady, { once: true });

  $("navLive")?.addEventListener("click", () => ensureBoot(), { once: true });
  $("navSpecs")?.addEventListener("click", () => ensureBoot(), { once: true });
  $("finaleToLive")?.addEventListener("click", () => ensureBoot(), { once: true });
  void idleTimer;
}
scheduleBoot();

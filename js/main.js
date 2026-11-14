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
$("drive").style.height = (TABS.length + 1) * 100 + "svh";
let scrollLock = false;
let liveInView = false;
let introPending = false;
let bootStarted = false;
let ensureBoot = () => {};
let rafId = null;
let lastCamSig = NaN;
let lastCoordsStr = "";

function wakeLoop() {
  if (!rafId) {
    prev = performance.now();
    fpsAcc = 0;
    fpsN = 0;
    rafId = requestAnimationFrame(tick);
  }
}

new IntersectionObserver((entries) => {
  const wasInView = liveInView;
  liveInView = entries.some((e) => e.isIntersecting);
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

$("stage")?.addEventListener("pointerdown", wakeLoop, { passive: true });
$("stage")?.addEventListener("wheel", wakeLoop, { passive: true });
addEventListener("stage:dirty", () => { if (liveInView) wakeLoop(); });
addEventListener("resize", () => { if (liveInView) wakeLoop(); }, { passive: true });

function scrollToProgress(p, immediate = false) {
  const drive = $("drive");
  const base = drive.offsetTop;
  const max = Math.max(0, drive.offsetHeight - innerHeight);
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

function bindScroll() {
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({
    trigger: "#drive",
    start: "top top",
    end: "bottom bottom",
    onUpdate(self) {
      if (scrollLock || app.mode === "intro") return;
      const idx = Math.round(self.progress * TABS.length) - 1;
      if (idx < 0) {
        if (app.mode !== "hero") enterHero(true);
        return;
      }
      if (app.tab !== idx) applyTab(idx, true);
    }
  });
}

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
  await new Promise((r) => setTimeout(r, 0));
  let model;
  try {
    if (!PRODUCT.glb) throw new Error("no glb");
    model = await loadModel(PRODUCT.glb, stage.renderer, mats, (f) => {
      if ($("loader-bar")) $("loader-bar").style.width = Math.round(f * 70) + "%";
    }, still);
  } catch (err) {
    console.warn("model: placeholder", err.message);
    model = placeholderModel(mats);
  }
  scene.add(model.root);
  app.parts = model.parts;

  const box = new THREE.Box3().setFromObject(model.root);
  app.floorY = box.min.y + 0.003;
  stage.catcher.position.y = app.floorY;
  stage.shadowLight.position.set(-0.14, app.floorY + 6.4, 0.18);
  stage.shadowLight.target.position.set(0, app.floorY, 0);

  const visorBar = new THREE.CapsuleGeometry(0.0028, 0.048, 6, 16);
  const chestSlit = new THREE.CapsuleGeometry(0.0018, 0.032, 6, 16);
  const jointRing = new THREE.TorusGeometry(0.013, 0.0017, 12, 36);
  addLamp(app.lamps, scene, findPart("head_link") || findPart("head"), [0.068, -0.022, 0], visorBar, mats.led, [Math.PI / 2, 0, 0]);
  addLamp(app.lamps, scene, findPart("torso_link") || findPart("torso"), [0.076, 0.034, 0], chestSlit, mats.led, [Math.PI / 2, 0, 0]);
  addLamp(app.lamps, scene, findPart("left_elbow_link") || findPart("armL"), [0.002, -0.026, -0.0355], jointRing, mats.led, [0, 0, 0]);
  addLamp(app.lamps, scene, findPart("right_elbow_link") || findPart("armR"), [0.002, -0.026, 0.0355], jointRing, mats.led, [0, 0, 0]);

  if ($("loader-bar")) $("loader-bar").style.width = "100%";
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  await new Promise((r) => setTimeout(r, 0)); // yield one macrotask before GPU shader compile
  stage.renderer.compile(scene, camera);
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

// Ленивый старт Акта II после первого кадра Акта I, при скролле или клике — ноль нагрузки на старт Акта I
function scheduleBoot() {
  ensureBoot = () => {
    if (bootStarted) return;
    bootStarted = true;
    boot().catch((err) => {
      console.error(err);
      $("fail").hidden = false;
    });
  };
  if (still || liveInView) {
    ensureBoot();
    return;
  }
  const triggerLater = () => setTimeout(() => ensureBoot(), 400);
  if (window.__story?.state()?.ready) triggerLater();
  else addEventListener("story:ready", triggerLater, { once: true });

  const onScroll = () => {
    const storyEl = $("story");
    const thresh = storyEl ? storyEl.offsetTop + Math.min(innerHeight * 0.65, storyEl.offsetHeight * 0.12) : innerHeight * 0.65;
    if (scrollY >= thresh || liveInView) {
      removeEventListener("scroll", onScroll);
      ensureBoot();
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  $("navLive")?.addEventListener("click", () => ensureBoot(), { once: true });
  $("finaleToLive")?.addEventListener("click", () => ensureBoot(), { once: true });
  // Запасной ленивый старт на случай если Акт I ещё грузится дольше 2.8с
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2800));
  setTimeout(() => idle(() => {
    if (!bootStarted && document.visibilityState === "visible") ensureBoot();
  }), 2800);
}
scheduleBoot();

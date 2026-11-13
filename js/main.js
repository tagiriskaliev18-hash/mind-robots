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

// Экранные прямоугольники деталей — critic проверяет, что карточки не лежат на объекте.
app.partRects = () => app.parts.map((p) => {
  const b = p.mesh.geometry.boundingBox, r = { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity };
  for (let i = 0; i < 8; i++) {
    const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
      .add(p.mesh.position)
      .project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    r.x = Math.min(r.x, x); r.y = Math.min(r.y, y); r.r = Math.max(r.r, x); r.b = Math.max(r.b, y);
  }
  return r;
});
addEventListener("error", (e) => app.errors.push(String(e.message)));

const stage = createStage($("stage"));
app.stage = stage;
const { scene, camera } = stage;
const rig = createRig(camera, $("stage"), still);
const title = createTitle(scene, gsap, still);
const mats = makeMaterials();
const callouts = createCallouts({
  els: [$("c0"), $("c1"), $("c2")],
  svg: $("leaders"),
  isPhone,
  getSafe: () => ({
    top: Math.round($("tabs").getBoundingClientRect().bottom + (isPhone() ? 14 : innerHeight * 0.06)),
    bottom: innerHeight - 78
  })
});

// ---------- tabs + scroll: одна дорожка, одна камера ----------
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

function scrollToProgress(p) {
  const max = $("drive").offsetHeight - innerHeight;
  if (still || !gsap) { scrollTo(0, p * max); return; }
  scrollLock = true;
  gsap.to(document.documentElement, {
    scrollTop: p * max,
    duration: 0.9,
    ease: "expo.out",
    onComplete: () => { scrollLock = false; }
  });
}

function findPart(token) {
  return (
    app.parts.find((p) => p.name === token) ||
    app.parts.find((p) => p.name.startsWith(token)) ||
    app.parts.find((p) => p.group === token)
  );
}

function enterHero(fromScroll) {
  app.mode = "hero"; app.tab = -1; app.since = 0;
  rig.setTarget(HERO, isPhone(), isPhone() ? (HERO.phoneRadius ?? 1.18) : 1);
  setGoals(app.parts, null);
  callouts.hide();
  title.set(true);
  $("hud-index").textContent = "";
  tabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  if (!fromScroll) scrollToProgress(0);
}

function applyTab(i, fromScroll) {
  const tab = TABS[i];
  if (app.mode === "hero" || app.mode === "intro") title.set(false);
  app.mode = "tab"; app.tab = i; app.since = 0; app.label = 0;
  setGoals(app.parts, tab, isPhone());
  if (tab.fit) fitExploded(app.parts, camera, tab, isPhone());
  const phoneMul = isPhone() ? (tab.phoneRadius ?? 1.18) : 1;
  rig.setTarget(tab, isPhone(), phoneMul);
  callouts.show(tab.calls, findPart);
  $("hud-index").innerHTML = String(i + 1).padStart(2, "0") + `<span>/${String(TABS.length).padStart(2, "0")}</span>`;
  tabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.tab) === i)));
  if (!fromScroll) scrollToProgress((i + 1) / TABS.length);
}

tabsEl.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && app.mode !== "loading") applyTab(Number(b.dataset.tab), false);
});
addEventListener("keydown", (e) => {
  if (app.mode === "loading") return;
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
      if (idx < 0) { if (app.mode !== "hero") enterHero(true); return; }
      if (app.tab !== idx) applyTab(idx, true);
    }
  });
}

// ---------- intro: один непрерывный пролёт камеры ----------
function playIntro() {
  document.documentElement.classList.add("is-ready");
  const heroPhoneMul = isPhone() ? (HERO.phoneRadius ?? 1.18) : 1;
  if (still || !gsap) {
    rig.state.locked = false;
    enterHero(true);
    mats.led.emissiveIntensity = QUALITY.ledEmissive;
    bindScroll();
    return;
  }
  app.mode = "intro";
  const s = rig.state;
  s.locked = true;
  Object.assign(s, { radius: INTRO.radius, phi: INTRO.phi, theta: INTRO.theta });
  s.look.fromArray(INTRO.look);
  rig.setTarget(HERO, isPhone(), heroPhoneMul);
  mats.led.emissiveIntensity = 0;
  const look = { x: INTRO.look[0], y: INTRO.look[1], z: INTRO.look[2] };
  const targetR = s.target.radius;
  const targetLook = s.target.look.clone();
  gsap.timeline({ onComplete: () => { s.locked = false; app.mode = "hero"; bindScroll(); } })
    .to(s, { radius: targetR, phi: HERO.phi, theta: HERO.theta, duration: INTRO.duration, ease: "expo.inOut" }, 0)
    .to(look, {
      x: targetLook.x, y: targetLook.y, z: targetLook.z,
      duration: INTRO.duration, ease: "expo.inOut",
      onUpdate: () => s.look.set(look.x, look.y, look.z)
    }, 0)
    .to(mats.led, { emissiveIntensity: QUALITY.ledEmissive, duration: 0.9, ease: "power2.out" }, 0.9)
    .add(() => title.set(true), 1.3)
    .fromTo("#hud", { opacity: 0.01 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, 1.1);
}

// ---------- boot ----------
async function boot() {
  let model;
  try {
    if (!PRODUCT.glb) throw new Error("no glb");
    model = await loadModel(PRODUCT.glb, stage.renderer, mats, (f) => {
      $("loader-bar").style.width = Math.round(f * 70) + "%";
    });
  } catch (err) {
    console.warn("model: placeholder", err.message);
    model = placeholderModel(mats);
  }
  scene.add(model.root);
  app.parts = model.parts;

  // Пол: по нижней точке модели. Контактная тень и shadow-камера — точно под стопами.
  const box = new THREE.Box3().setFromObject(model.root);
  app.floorY = box.min.y + 0.003;
  stage.catcher.position.y = app.floorY;
  stage.shadowLight.position.set(-0.14, app.floorY + 6.4, 0.18);
  stage.shadowLight.target.position.set(0, app.floorY, 0);

  // Лампы: физическая LED-полоса визора G1, индикатор грудной панели и коаксиальные кольца локтевых приводов (bloom > 3.4).
  const visorBar = new THREE.CapsuleGeometry(0.0028, 0.048, 6, 16);
  const chestSlit = new THREE.CapsuleGeometry(0.0018, 0.032, 6, 16);
  const jointRing = new THREE.TorusGeometry(0.013, 0.0017, 12, 36);
  addLamp(app.lamps, scene, findPart("head_link") || findPart("head"), [0.068, -0.022, 0], visorBar, mats.led, [Math.PI / 2, 0, 0]);
  addLamp(app.lamps, scene, findPart("torso_link") || findPart("torso"), [0.076, 0.034, 0], chestSlit, mats.led, [Math.PI / 2, 0, 0]);
  addLamp(app.lamps, scene, findPart("left_elbow_link") || findPart("armL"), [0.002, -0.026, -0.0355], jointRing, mats.led, [0, 0, 0]);
  addLamp(app.lamps, scene, findPart("right_elbow_link") || findPart("armR"), [0.002, -0.026, 0.0355], jointRing, mats.led, [0, 0, 0]);

  $("loader-bar").style.width = "100%";
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  stage.renderer.compile(scene, camera); // прогрев шейдеров до первого кадра
  playIntro();
}

// ---------- loop ----------
let prev = performance.now(), fpsAcc = 0, fpsN = 0;
function tick(now) {
  const raw = (now - prev) / 1000;
  const dt = Math.min(0.033, Math.max(0.001, raw));
  prev = now;
  fpsAcc += raw; fpsN++;
  if (fpsAcc > 0.5) { app.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  app.since += dt;
  for (const p of app.parts) springStep(p, dt, still);
  for (const l of app.lamps) {
    const p = l.userData.part;
    l.position.copy(p.mesh.position).add(p.centerLocal).add(l.userData.local);
  }
  const camErr = rig.update(dt);
  title.update(camera, HERO.look[1] + 0.11, isPhone());
  app.titleVisible = title.visible;
  app.err = camErr + settleError(app.parts);
  if (app.mode === "tab") {
    const want = app.err < MOTION.labelShowError || app.since > MOTION.labelShowAfter ? 1 : 0;
    app.label = still ? 1 : app.label + (want - app.label) * (1 - Math.exp(-MOTION.labelLambda * dt));
    callouts.update(camera, title.visible ? 0 : app.label);
  }
  const p = camera.position;
  $("hud-coords").textContent = `X ${p.x.toFixed(2)} · Y ${p.y.toFixed(2)} · Z ${p.z.toFixed(2)}`;
  stage.render(dt);
  stage.adapt(dt);
  requestAnimationFrame(tick);
}

boot().catch((err) => { console.error(err); $("fail").hidden = false; });
requestAnimationFrame(tick);

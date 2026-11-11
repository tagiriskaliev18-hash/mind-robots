import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer, EffectPass, RenderPass, BloomEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { N8AOPostPass } from "n8ao";

const TABS = [
  {
    id: "head",
    radius: 1.9,
    phi: 1.16,
    theta: 1.35,
    look: [0.05, 1.82, 0.0],
    calls: [
      { part: "neck_pitch", title: "Шлем", fig: "камера", unit: "", note: "Камера восприятия стоит в голове.", at: [0.09, 0.04, 0.0] },
      { part: "neck_yaw", title: "Шея", fig: "взгляд", unit: "", note: "Поворот головы показывает, куда Apollo пойдёт.", at: [0.03, 0.02, 0.0] },
      { part: "torso_link__4", title: "Обзор", fig: "360°", unit: "", note: "Датчики корпуса замыкают вид вокруг.", at: [0.12, 0.06, 0.0], desk: true }
    ]
  },
  {
    id: "arms",
    radius: 2.15,
    phi: 1.32,
    theta: 2.35,
    look: [0.0, 1.15, -0.2],
    calls: [
      { part: "l_shoulder_fe", title: "Плечо", fig: "электро", unit: "", note: "Приводы электрические, не гидравлика.", at: [0.02, 0.02, -0.04] },
      { part: "l_elbow", title: "Локоть", fig: "сила", unit: "", note: "Силовое управление для работы рядом с людьми.", at: [0.02, 0.0, -0.03] },
      { part: "l_wrist_pitch", title: "Кисть", fig: "смена", unit: "", note: "Конечность остаётся одним блоком.", at: [0.0, 0.0, -0.04], desk: true }
    ]
  },
  {
    id: "body",
    radius: 2.55,
    phi: 1.28,
    theta: 0.48,
    look: [0.0, 1.2, 0.0],
    calls: [
      { part: "torso_link__4", title: "Рост", fig: "1,7", unit: "м", note: "Человеческий масштаб: 5 футов 8 дюймов.", at: [0.12, 0.1, 0.0] },
      { part: "base_link", title: "Масса", fig: "73", unit: "кг", note: "160 фунтов. IEEE: около 73 кг.", at: [0.08, 0.02, 0.0] },
      { part: "torso_link__4", title: "Грудь", fig: "экран", unit: "", note: "Панель показывает заряд и текущую задачу.", at: [0.1, -0.02, 0.04], desk: true }
    ]
  },
  {
    id: "drive",
    radius: 1.9,
    phi: 1.3,
    theta: 2.15,
    look: [-0.02, 1.32, -0.18],
    calls: [
      { part: "l_shoulder_aa", title: "Привод", fig: "электро", unit: "", note: "Электрические актуаторы вместо гидравлики.", at: [0.0, 0.02, -0.03] },
      { part: "torso_link__7", title: "Батарея", fig: "4", unit: "ч", note: "Блок меняется. На смене — около суток работы.", at: [0.04, 0.0, 0.0] },
      { part: "torso_pitch", title: "Контур", fig: "сила", unit: "", note: "Силовое управление держит контакт безопасным.", at: [0.04, 0.02, 0.0], desk: true }
    ]
  },
  {
    id: "tear",
    radius: 4.6,
    phi: 1.18,
    theta: 0.62,
    look: [0.0, 1.15, 0.0],
    calls: [
      { part: "neck_pitch", title: "Шлем", fig: "камера", unit: "", note: "Снимается вместе с шеей, по вертикали.", at: [0.08, 0.04, 0.0] },
      { part: "l_shoulder_fe", title: "Рука", fig: "блок", unit: "", note: "Плечо, локоть и кисть. Пальцы остаются на кисти.", at: [0.0, 0.04, -0.05] },
      { part: "l_knee", title: "Нога", fig: "опора", unit: "", note: "Бедро, колено и стопа — одна колонна.", at: [0.02, 0.05, -0.04], desk: true }
    ]
  },
  {
    id: "build",
    radius: 3.82,
    phi: 1.2,
    theta: 0.68,
    look: [0.0, 0.96, 0.0],
    calls: [
      { part: "neck_pitch", title: "Рост", fig: "1,7", unit: "м", note: "Опубликовано Apptronik при показе Apollo.", at: [0.1, 0.04, 0.0] },
      { part: "l_shoulder_fe", title: "Груз", fig: "25", unit: "кг", note: "55 фунтов. Потолок полезной нагрузки.", at: [0.0, 0.02, -0.04] },
      { part: "torso_link__7", title: "Смена", fig: "4", unit: "ч", note: "Один блок. Замена вместо простоя на зарядке.", at: [0.06, 0.0, 0.02], desk: true }
    ]
  }
];

const HERO = { radius: 3.05, phi: 1.16, theta: 0.62, look: [0, 0.9, 0] };

const still = document.documentElement.classList.contains("is-still");
const phoneQuery = window.matchMedia("(max-width: 700px)");
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

const canvas = document.getElementById("stage");
const hud = document.getElementById("hud");
const tabsEl = document.getElementById("tabs");
const indexEl = document.getElementById("hud-index");
const coordsEl = document.getElementById("hud-coords");
const headline = document.getElementById("headline");
const leaders = document.getElementById("leaders");
const loaderBar = document.getElementById("loader-bar");
const calls = [0, 1, 2].map((i) => document.getElementById("c" + i));
const reading = document.getElementById("reading");
const drive = document.getElementById("drive");

const scratch = new THREE.Vector3();
const goal = new THREE.Vector3();
const look = new THREE.Vector3(0, 1.0, 0);
const lookTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

const state = {
  hero: true,
  tab: -1,
  fromScroll: false,
  radius: HERO.radius,
  phi: HERO.phi,
  theta: HERO.theta,
  dragTheta: 0,
  dragPhi: 0,
  yawVel: 0,
  phiVel: 0,
  pinch: 1,
  orbit: 0.4,
  label: 0,
  ready: false,
  quality: 1
};

let parts = [];
let eyes = [];
let renderer;
let composer;
let bloom;
let camera;
let scene;
let floorY = 0;
let dragging = false;
let pointers = new Map();
let pinchDist = 0;
let scrollLock = false;
let frameBudget = [];

function phone() {
  return phoneQuery.matches;
}

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function dampAngle(current, target, lambda, dt) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function kindOf(name) {
  if (name.startsWith("neck_")) return "head";
  if (/^[lr]_(shoulder|elbow|wrist)/.test(name)) return "arm";
  if (/^[lr]_(hip|knee|ankle|foot)/.test(name)) return "leg";
  return "body";
}

function sideOf(name) {
  if (name.startsWith("l_")) return -1;
  if (name.startsWith("r_")) return 1;
  return 0;
}

function isActuator(name) {
  return /shoulder_aa|shoulder_ie|elbow|hip_ie|hip_aa|knee|ankle|neck_yaw|torso_roll|torso_pitch/.test(name);
}

function findPart(token) {
  return parts.find((p) => p.name.startsWith(token));
}

function buildLayout() {
  const arms = { "-1": [], 1: [] };
  const legs = { "-1": [], 1: [] };
  parts.forEach((p) => {
    if (p.kind === "arm") arms[p.side].push(p);
    if (p.kind === "leg") legs[p.side].push(p);
  });
  [-1, 1].forEach((side) => {
    const chain = arms[side].sort((a, b) => b.center.y - a.center.y);
    if (!chain.length) return;
    const axis = chain[chain.length - 1].center.clone().sub(chain[0].center).normalize();
    const fan = new THREE.Vector3(-axis.z, 0, axis.x).normalize();
    chain.forEach((p, i) => {
      p.axis = axis;
      p.rank = i;
      p.fan = fan;
      p.finger = 0;
    });
    const pitches = chain.filter((p) => p.name.includes("wrist_pitch"));
    pitches.sort((a, b) => b.center.y - a.center.y);
    const palm = pitches[0];
    pitches.slice(1).forEach((p) => {
      p.rank = palm ? palm.rank : p.rank;
      p.axis = palm ? palm.axis : p.axis;
      p.finger = 0;
      p.locked = true;
    });
    const leg = legs[side].sort((a, b) => b.center.y - a.center.y);
    if (!leg.length) return;
    const down = leg[leg.length - 1].center.clone().sub(leg[0].center).normalize();
    leg.forEach((p, i) => {
      p.axis = down;
      p.rank = i;
      p.fan = new THREE.Vector3(1, 0, 0);
      p.finger = 0;
    });
  });
}

function writeGoal(part, mode, out) {
  out.set(0, 0, 0);
  const side = part.side || (part.center.z < 0 ? -1 : 1);
  const along = (part.axis && !part.locked) ? part.rank * 0.045 : (part.axis ? part.rank * 0.045 : 0);
  if (mode === "head") {
    if (part.name.startsWith("neck_pitch")) out.set(0, 0.28, 0);
    else if (part.kind === "head") out.set(0, 0.14, 0);
    return;
  }
  if (mode === "arms") {
    if (part.kind !== "arm" || !part.axis) return;
    out.copy(part.axis).multiplyScalar(along);
    out.z += side * 0.16;
    return;
  }
  if (mode === "body") {
    if (part.name.startsWith("base_link")) out.set(0, -0.16, 0);
    else if (part.name.startsWith("torso_link__4")) out.set(0, 0.22, 0);
    else if (part.kind === "body") out.set(0, 0.1, 0);
    else if (part.kind === "head") out.set(0, 0.34, 0);
    return;
  }
  if (mode === "drive") {
    if (!part.mainActuator) return;
    if (part.kind === "arm") out.set(0.01, 0.03, side * 0.07);
    else if (part.kind === "leg") out.set(0.01, -0.02, side * 0.06);
    else if (part.kind === "head") out.set(0, 0.06, 0);
    else out.set(-0.05, 0.03, 0);
    return;
  }
  if (mode === "tear") {
    if (part.name.startsWith("neck_pitch")) out.set(0, 0.46, 0);
    else if (part.kind === "head") out.set(0, 0.26, 0);
    else if (part.name.startsWith("base_link")) out.set(0, -0.02, 0);
    else if (part.kind === "body") out.set(0, 0.12, 0);
    else if (part.kind === "arm" && part.axis) {
      out.copy(part.axis).multiplyScalar(along * 0.7);
      out.z += side * 0.4;
      out.y += 0.02;
    } else if (part.kind === "leg" && part.axis) {
      out.copy(part.axis).multiplyScalar(part.rank * 0.035);
      out.z += side * 0.2;
    }
  }
}

function springStep(part, dt) {
  part.age = (part.age || 0) + dt;
  const open = part.age < part.delay ? 0 : 1;
  const k = 70;
  const dampN = 9.6;
  scratch.copy(part.goal).multiplyScalar(open).sub(part.pos).multiplyScalar(k).addScaledVector(part.vel, -dampN);
  part.vel.addScaledVector(scratch, dt);
  part.pos.addScaledVector(part.vel, dt);
}

function hideCalls() {
  calls.forEach((el) => {
    el.hidden = true;
    el.dataset.on = "0";
    el.style.opacity = "0";
  });
}

function setTitle(on) {
  if (!state.title) return;
  const mat = state.title.material;
  if (!state.titleSlideObj) state.titleSlideObj = { v: 0 };
  const slide = state.titleSlideObj;
  if (phone()) {
    if (gsap) {
      gsap.killTweensOf(mat);
      gsap.killTweensOf(slide);
    }
    mat.opacity = 0;
    state.title.visible = false;
    return;
  }
  if (gsap) {
    gsap.killTweensOf(mat);
    gsap.killTweensOf(slide);
  }
  if (on) {
    state.title.visible = true;
    slide.v = 0.28;
    if (gsap && !still) {
      gsap.to(mat, { opacity: 1, duration: 0.9, ease: "expo.out" });
      gsap.to(slide, { v: 0, duration: 0.9, ease: "expo.out" });
    } else {
      mat.opacity = 1;
      slide.v = 0;
    }
  } else if (gsap && !still) {
    gsap.to(mat, { opacity: 0, duration: 0.55, ease: "expo.out" });
    gsap.to(slide, {
      v: 0.42,
      duration: 0.55,
      ease: "expo.out",
      onComplete: () => { if (!state.hero) state.title.visible = false; }
    });
  } else {
    mat.opacity = 0;
    slide.v = 0;
    state.title.visible = false;
  }
}

function enterHero(fromScroll) {
  state.hero = true;
  state.tab = -1;
  state.since = 0;
  state.shownAt = performance.now();
  lookTarget.set(HERO.look[0], HERO.look[1], HERO.look[2]);
  parts.forEach((p) => {
    p.age = 0;
    p.vel.set(0, 0, 0);
    p.goal.set(0, 0, 0);
  });
  tabsEl.querySelectorAll("button").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
  if (indexEl) indexEl.innerHTML = "";
  hideCalls();
  setTitle(true);
  if (!fromScroll && !still && gsap && drive) {
    scrollLock = true;
    gsap.to(document.documentElement, {
      scrollTop: 0,
      duration: 0.8,
      ease: "expo.out",
      onComplete: () => { scrollLock = false; }
    });
  }
}

function applyTab(index, fromScroll) {
  const wasHero = state.hero;
  state.hero = false;
  state.tab = index;
  state.since = 0;
  state.shownAt = performance.now();
  if (wasHero) setTitle(false);
  const tab = TABS[index];
  lookTarget.set(tab.look[0], tab.look[1], tab.look[2]);
  parts.forEach((p) => {
    p.age = 0;
    p.vel.set(0, 0, 0);
    writeGoal(p, tab.id, p.goal);
  });
  if (tab.id === "tear") fitExploded();
  tabsEl.querySelectorAll("button").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(Number(btn.dataset.tab) === index));
  });
  indexEl.innerHTML = String(index + 1).padStart(2, "0") + "<span>/06</span>";
  const shown = tab.calls.filter((c) => !(c.desk && phone()));
  calls.forEach((el, i) => {
    const spec = shown[i];
    if (!spec) {
      el.hidden = true;
      el.dataset.on = "0";
      return;
    }
    el.hidden = false;
    el.dataset.on = "1";
    el.dataset.part = spec.part;
    el.dataset.ox = spec.at[0];
    el.dataset.oy = spec.at[1];
    el.dataset.oz = spec.at[2];
    el.innerHTML = '<p class="idx">' + spec.title + '</p><p class="fig">' + spec.fig +
      (spec.unit ? "<span>" + spec.unit + "</span>" : "") + "</p><p class=\"note\">" + spec.note + "</p>";
  });
  if (!fromScroll && !still && gsap && drive) {
    const max = drive.offsetHeight - window.innerHeight;
    scrollLock = true;
    gsap.to(document.documentElement, {
      scrollTop: (index / 5) * max,
      duration: still ? 0 : 0.9,
      ease: "expo.out",
      onComplete: () => { scrollLock = false; }
    });
  }
}

function placeCamera(dt) {
  const tab = state.hero ? HERO : TABS[state.tab];
  const glide = still ? 80 : 4.6;
  const phoneScale = phone() && !state.hero && state.tab !== 4 ? (state.tab === 0 ? 1.72 : 1.08) : 1;
  state.radius = damp(state.radius, tab.radius * phoneScale, glide, dt);
  state.phi = damp(state.phi, tab.phi, glide, dt);
  state.theta = dampAngle(state.theta, tab.theta, glide, dt);
  const wantLook = lookTarget.clone();
  if (phone() && state.tab === 0) wantLook.y -= 0.55;
  look.lerp(wantLook, 1 - Math.exp(-glide * dt));
  if (!still && !dragging) {
    state.driftT = (state.driftT || 0) + dt;
    state.orbit += dt * 0.1;
  }
  state.dragTheta += state.yawVel * dt;
  state.dragPhi += state.phiVel * dt;
  const decay = Math.exp(-3.4 * dt);
  state.yawVel *= decay;
  state.phiVel *= decay;
  const bob = still ? 0 : Math.sin((state.driftT || 0) * 0.18) * 0.04;
  const breathe = still ? 0 : Math.sin((state.driftT || 0) * 0.11) * 0.07;
  const phi = THREE.MathUtils.clamp(state.phi + state.dragPhi + bob, 0.72, 1.46);
  const radius = THREE.MathUtils.clamp((state.radius + breathe) * state.pinch, 1.05, 8.2);
  const theta = state.theta + state.dragTheta + (still ? 0 : state.orbit);
  const sin = Math.sin(phi);
  camPos.set(
    look.x + radius * sin * Math.sin(theta),
    look.y + radius * Math.cos(phi),
    look.z + radius * sin * Math.cos(theta)
  );
  camera.position.copy(camPos);
  camera.lookAt(look);
  coordsEl.textContent = "X " + camPos.x.toFixed(2) + " · Y " + camPos.y.toFixed(2) + " · Z " + camPos.z.toFixed(2);
}

function motionError() {
  const tab = state.hero ? HERO : TABS[state.tab];
  let err = Math.abs(state.radius - tab.radius) * 0.2;
  err += look.distanceTo(lookTarget);
  let max = 0;
  parts.forEach((p) => {
    max = Math.max(max, p.pos.distanceTo(p.goal), p.vel.length() * 0.35);
  });
  return err + max;
}

function project(vec) {
  scratch.copy(vec).project(camera);
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: (scratch.x * 0.5 + 0.5) * w,
    y: (-scratch.y * 0.5 + 0.5) * h,
    z: scratch.z
  };
}

function drawLabels() {
  const titleUp = state.title && state.title.visible && state.title.material.opacity > 0.04 && !phone();
  if (state.hero || titleUp) {
    while (leaders.firstChild) leaders.removeChild(leaders.firstChild);
    calls.forEach((el) => { el.style.opacity = "0"; });
    return;
  }
  const show = state.label;
  while (leaders.firstChild) leaders.removeChild(leaders.firstChild);
  const active = calls.filter((el) => el.dataset.on === "1");
  const placed = [];
  const ns = "http://www.w3.org/2000/svg";
  const w = window.innerWidth;
  const h = window.innerHeight;
  active.forEach((el) => {
    const part = findPart(el.dataset.part);
    if (!part) {
      el.style.opacity = "0";
      return;
    }
    scratch.copy(part.mesh.position).add(part.centerLocal);
    scratch.x += Number(el.dataset.ox);
    scratch.y += Number(el.dataset.oy);
    scratch.z += Number(el.dataset.oz);
    const pt = project(scratch);
    if (pt.z > 1) {
      el.style.opacity = "0";
      return;
    }
    placed.push({ el, x: pt.x, y: pt.y });
  });
  const gutter = phone() ? 16 : Math.max(28, w * 0.04);
  const columns = { left: [], right: [] };
  placed.forEach((item) => {
    item.el.style.opacity = String(show);
    item.side = phone() || item.x < w * 0.5 ? "left" : "right";
    columns[item.side].push(item);
  });
  ["left", "right"].forEach((side) => {
    const col = columns[side].sort((a, b) => a.y - b.y);
    let cursor = Math.round(phone() ? 78 : h * 0.16);
    col.forEach((item) => {
      const el = item.el;
      el.style.width = phone() ? "min(150px, 44vw)" : "min(210px, 18vw)";
      if (side === "left") {
        el.style.left = gutter + "px";
        el.style.right = "auto";
      } else {
        el.style.right = gutter + "px";
        el.style.left = "auto";
      }
      const want = phone() ? cursor : Math.max(cursor, Math.round(item.y - 24));
      el.style.top = want + "px";
      cursor = want + el.getBoundingClientRect().height + 16;
    });
    const last = col[col.length - 1];
    if (!last) return;
    const bottom = last.el.getBoundingClientRect().bottom;
    const limit = phone() ? h * 0.36 : h - 78;
    if (bottom > limit) {
      const shift = bottom - limit;
      col.forEach((item) => {
        item.el.style.top = (parseFloat(item.el.style.top) - shift) + "px";
      });
    }
  });
  placed.forEach((item) => {
    const box = item.el.getBoundingClientRect();
    if (show < 0.04) return;
    const side = item.side;
    const x1 = side === "left" ? box.right : box.left;
    const y1 = box.top + 0.5;
    const path = document.createElementNS(ns, "polyline");
    path.setAttribute("points", [
      item.x.toFixed(1) + "," + item.y.toFixed(1),
      (side === "left" ? item.x - 18 : item.x + 18).toFixed(1) + "," + item.y.toFixed(1),
      (side === "left" ? item.x - 18 : item.x + 18).toFixed(1) + "," + y1.toFixed(1),
      x1.toFixed(1) + "," + y1.toFixed(1)
    ].join(" "));
    path.setAttribute("stroke-opacity", show.toFixed(3));
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", item.x.toFixed(1));
    dot.setAttribute("cy", item.y.toFixed(1));
    dot.setAttribute("r", "2.4");
    dot.setAttribute("fill-opacity", show.toFixed(3));
    leaders.appendChild(path);
    leaders.appendChild(dot);
  });
}

function fitShadow(light) {
  const cam = light.shadow.camera;
  cam.left = -2.2;
  cam.right = 2.2;
  cam.top = 2.2;
  cam.bottom = -2.2;
  cam.near = 0.4;
  cam.far = 9;
  cam.updateProjectionMatrix();
}

function makeContact() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cap = phone() ? 2 : 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, cap);
  if (state.quality < 1) dpr = Math.min(dpr, state.quality < 0.5 ? 1 : 1.35);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (composer) composer.setSize(w, h);
  if (bloom && state.quality < 0.5) bloom.enabled = false;
}

function adapt(dt) {
  frameBudget.push(dt);
  if (frameBudget.length < 45) return;
  const avg = frameBudget.reduce((a, b) => a + b, 0) / frameBudget.length;
  frameBudget.length = 0;
  if (avg > 0.022 && state.quality > 0.4) {
    state.quality *= 0.7;
    if (bloom) bloom.enabled = false;
    resize();
  }
}

function tick(now) {
  const t = now * 0.001;
  const dt = Math.min(0.033, Math.max(0.001, t - (tick.prev || t)));
  tick.prev = t;
  state.since = (state.since || 0) + dt;
  if (!state.ready) {
    requestAnimationFrame(tick);
    return;
  }
  parts.forEach((p) => {
    if (!still) springStep(p, dt);
    else p.pos.copy(p.goal);
    p.mesh.position.copy(p.rest).add(p.pos);
  });
  eyes.forEach((eye) => {
    const part = eye.userData.part;
    if (!part) return;
    eye.position.copy(part.mesh.position).add(part.centerLocal).add(eye.userData.local);
    eye.lookAt(camera.position);
  });
  if (state.shadowLight && state.shadowCatcher) {
    const feet = new THREE.Vector3();
    let nFeet = 0;
    parts.forEach((p) => {
      if (p.name.includes("foot")) {
        feet.add(p.mesh.position);
        nFeet += 1;
      }
    });
    if (nFeet) feet.multiplyScalar(1 / nFeet);
    else feet.set(0, floorY, 0);
    state.shadowLight.position.set(feet.x - 0.15, floorY + 7.2, feet.z + 0.2);
    state.shadowLight.target.position.set(feet.x, floorY, feet.z);
    state.shadowLight.target.updateMatrixWorld();
    state.shadowCatcher.position.set(feet.x, floorY, feet.z);
  }
  if (state.title) {
    const mat = state.title.material;
    const showTitle = !phone() && mat.opacity > 0.01 && (state.hero || mat.opacity > 0.02);
    if (showTitle) {
      if (!state.titleRight) {
        state.titleRight = new THREE.Vector3();
        state.titleUp = new THREE.Vector3();
        state.titleBack = new THREE.Vector3();
      }
      state.titleRight.setFromMatrixColumn(camera.matrixWorld, 0);
      state.titleUp.setFromMatrixColumn(camera.matrixWorld, 1);
      state.titleBack.setFromMatrixColumn(camera.matrixWorld, 2);
      state.title.quaternion.copy(camera.quaternion);
      state.title.scale.setScalar(1.22);
      const slide = state.titleSlideObj ? state.titleSlideObj.v : 0;
      state.title.position.set(0, 1.02, 0)
        .addScaledVector(state.titleBack, -0.52)
        .addScaledVector(state.titleUp, slide);
      state.title.visible = true;
    } else {
      state.title.visible = false;
    }
  }
  placeCamera(dt);
  const err = motionError();
  state.err = Number(err.toFixed(3));
  state.frames = (state.frames || 0) + 1;
  const age = (performance.now() - (state.shownAt || 0)) / 1000;
  const goalLabel = err < 0.08 || age > 0.95 ? 1 : 0;
  state.label = still ? 1 : damp(state.label, goalLabel, 7, dt);
  drawLabels();
  const top = reading.getBoundingClientRect().top;
  const cover = 1 - Math.min(1, Math.max(0, top / (window.innerHeight * 0.55)));
  hud.style.opacity = String(1 - cover);
  if (state.refl && !phone() && state.ready) {
    const y = floorY;
    const rc = state.refl.cam;
    rc.fov = camera.fov;
    rc.aspect = camera.aspect;
    rc.position.set(camera.position.x, 2 * y - camera.position.y, camera.position.z);
    rc.up.set(0, -1, 0);
    rc.lookAt(look.x, 2 * y - look.y, look.z);
    rc.updateProjectionMatrix();
    const titleWas = state.title ? state.title.visible : false;
    state.shadowCatcher.visible = false;
    state.refl.plane.visible = false;
    if (state.title) state.title.visible = false;
    renderer.setRenderTarget(state.refl.target);
    renderer.clear();
    renderer.render(scene, rc);
    renderer.setRenderTarget(null);
    state.shadowCatcher.visible = true;
    state.refl.plane.visible = true;
    if (state.title) state.title.visible = titleWas;
    state.refl.plane.position.set(state.shadowCatcher.position.x, y + 0.012, state.shadowCatcher.position.z);
  }
  const t0 = performance.now();
  if (composer && bloom && bloom.enabled) {
    try { composer.render(dt); }
    catch (err) {
      console.warn("composer", err);
      bloom.enabled = false;
      composer = null;
      renderer.render(scene, camera);
    }
  } else renderer.render(scene, camera);
  state.renderMs = performance.now() - t0;
  adapt(dt);
  requestAnimationFrame(tick);
}

function bindInput() {
  tabsEl.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    applyTab(Number(btn.dataset.tab), false);
  });
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging = true;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    prev.x = event.clientX;
    prev.y = event.clientY;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) state.pinch = THREE.MathUtils.clamp(state.pinch * (pinchDist / dist), 0.55, 1.8);
      pinchDist = dist;
      return;
    }
    state.dragTheta -= dx * 0.0052;
    state.dragPhi -= dy * 0.0032;
    state.yawVel = -dx * 0.035;
    state.phiVel = -dy * 0.02;
  });
  const end = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) dragging = false;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  window.addEventListener("resize", resize);
  if (!still && gsap && ScrollTrigger && drive) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: drive,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (scrollLock) return;
        if (self.progress < 0.06) {
          if (!state.hero) enterHero(true);
          return;
        }
        const idx = Math.round(self.progress * 5);
        if (state.hero || idx !== state.tab) applyTab(idx, true);
      }
    });
  }
}

function triplanar(shader, amount) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTriPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;")
    .replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + sin(vTriPos.x*90.0)*sin(vTriPos.y*70.0)*sin(vTriPos.z*80.0)*0.045, 0.32, 0.72);"
    )
    .replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\n{\n  float nx = sin(vTriPos.y*160.0)*sin(vTriPos.z*140.0);\n  float ny = sin(vTriPos.x*150.0)*sin(vTriPos.z*130.0);\n  normal = normalize(normal + vec3(nx, ny, 0.0) * " + amount + ");\n}"
    );
}

function makeTitle() {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = 720;
  const ctx = c.getContext("2d");
  const paint = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#f4f2ee";
    ctx.textBaseline = "middle";
    ctx.font = "500 86px Geist, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Робот больше не", 36, 78);
    ctx.textAlign = "right";
    ctx.fillText("траекторию.", c.width - 36, 78);
    ctx.textAlign = "center";
    ctx.font = "500 196px Geist, sans-serif";
    ctx.fillText("повторяет", c.width / 2, 470);
    if (state.title) state.title.material.map.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.98), mat);
  plane.renderOrder = 1;
  plane.visible = false;
  scene.add(plane);
  state.title = plane;
  state.titleSlideObj = { v: 0.28 };
  paint();
  if (document.fonts && document.fonts.load) {
    document.fonts.load("500 210px Geist").then(paint).catch(() => {});
  }
}

function materials() {
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xe6e3dc,
    roughness: 0.56,
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
    envMapIntensity: 0.12
  });
  shell.onBeforeCompile = (shader) => triplanar(shader, "0.035");
  const joint = new THREE.MeshStandardMaterial({
    color: 0x2a2d33,
    roughness: 0.58,
    metalness: 0.62,
    envMapIntensity: 0.42
  });
  joint.onBeforeCompile = (shader) => triplanar(shader, "0.02");
  return { shell, joint };
}

function isHandOrFoot(name) {
  return /foot|wrist_pitch|wrist_yaw|wrist_roll|ankle/.test(name);
}

function deinterleave(geometry) {
  const geo = new THREE.BufferGeometry();
  for (const key of Object.keys(geometry.attributes)) {
    const attr = geometry.attributes[key];
    const data = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
      for (let k = 0; k < attr.itemSize; k++) data[i * attr.itemSize + k] = attr.getComponent(i, k);
    }
    geo.setAttribute(key, new THREE.BufferAttribute(data, attr.itemSize, attr.normalized));
  }
  if (geometry.index) {
    const src = geometry.index;
    const IndexArray = src.array instanceof Uint32Array ? Uint32Array : Uint16Array;
    const data = new IndexArray(src.count);
    for (let i = 0; i < src.count; i++) data[i] = src.getX(i);
    geo.setIndex(new THREE.BufferAttribute(data, 1));
  }
  return geo;
}

function creaseNormals(geometry) {
  let geo = deinterleave(geometry);
  geo = mergeVertices(geo, 1e-4);
  const index = geo.getIndex();
  const pos = geo.getAttribute("position");
  if (!index || !pos) return geometry;
  const idx = index.array;
  const faceCount = idx.length / 3;
  const fn = new Float32Array(faceCount * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let f = 0; f < faceCount; f++) {
    a.fromBufferAttribute(pos, idx[f * 3]);
    b.fromBufferAttribute(pos, idx[f * 3 + 1]);
    c.fromBufferAttribute(pos, idx[f * 3 + 2]);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    nrm.crossVectors(e1, e2);
    const len = nrm.length() || 1;
    fn[f * 3] = nrm.x / len;
    fn[f * 3 + 1] = nrm.y / len;
    fn[f * 3 + 2] = nrm.z / len;
  }
  const counts = new Uint16Array(pos.count);
  for (let i = 0; i < idx.length; i++) counts[idx[i]]++;
  const offsets = new Uint32Array(pos.count);
  let total = 0;
  for (let v = 0; v < pos.count; v++) {
    offsets[v] = total;
    total += counts[v];
  }
  const faces = new Uint32Array(total);
  const cursor = offsets.slice();
  for (let f = 0; f < faceCount; f++) {
    for (let k = 0; k < 3; k++) {
      const v = idx[f * 3 + k];
      faces[cursor[v]++] = f;
    }
  }
  const cosT = Math.cos(30 * Math.PI / 180);
  const outPos = new Float32Array(faceCount * 9);
  const outNor = new Float32Array(faceCount * 9);
  const acc = new THREE.Vector3();
  const baseN = new THREE.Vector3();
  const fnv = new THREE.Vector3();
  for (let f = 0; f < faceCount; f++) {
    baseN.set(fn[f * 3], fn[f * 3 + 1], fn[f * 3 + 2]);
    for (let k = 0; k < 3; k++) {
      const v = idx[f * 3 + k];
      acc.set(0, 0, 0);
      const start = offsets[v];
      const end = start + counts[v];
      for (let p = start; p < end; p++) {
        const of = faces[p];
        fnv.set(fn[of * 3], fn[of * 3 + 1], fn[of * 3 + 2]);
        if (baseN.dot(fnv) >= cosT) acc.add(fnv);
      }
      if (acc.lengthSq() < 1e-8) acc.copy(baseN);
      else acc.normalize();
      const o = (f * 3 + k) * 3;
      outPos[o] = pos.getX(v);
      outPos[o + 1] = pos.getY(v);
      outPos[o + 2] = pos.getZ(v);
      outNor[o] = acc.x;
      outNor[o + 1] = acc.y;
      outNor[o + 2] = acc.z;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(outNor, 3));
  return out;
}

function fitExploded() {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  parts.forEach((p) => {
    point.copy(p.center).add(p.goal);
    box.expandByPoint(point);
  });
  box.expandByScalar(0.18);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const vFov = camera.fov * Math.PI / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.45, camera.aspect));
  const fill = 0.84;
  const horiz = Math.hypot(size.x, size.z) * 0.62;
  const distY = (size.y * 0.5) / Math.tan(vFov / 2) / fill;
  const distX = (horiz * 0.5) / Math.tan(hFov / 2) / fill;
  TABS[4].radius = Math.max(distY, distX);
  TABS[4].look = [center.x, center.y, center.z];
  lookTarget.set(center.x, center.y, center.z);
}

function boot() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090f);
  scene.fog = new THREE.FogExp2(0x09090f, 0.048);
  camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.08, 40);
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x09090f, 1);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1;
  new RGBELoader().load("assets/hdri/studio_small_09_1k.hdr", (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(tex).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    if (scene.environmentRotation) scene.environmentRotation.y = 2.2;
    tex.dispose();
  });

  const hemi = new THREE.HemisphereLight(0xf2f0ea, 0x101014, 0.16);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 3.6);
  key.position.set(2.4, 5.4, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe7e4de, 0.28);
  fill.position.set(-2.4, 1.6, 2.2);
  scene.add(fill);
  const rimV = new THREE.SpotLight(0x7b2ff7, 7, 8, 0.18, 0.85, 1.2);
  rimV.position.set(-1.7, 1.7, -1.9);
  rimV.target.position.set(-0.15, 1.15, 0.05);
  scene.add(rimV);
  scene.add(rimV.target);
  const rimB = new THREE.SpotLight(0x3aa0ff, 5, 8, 0.16, 0.9, 1.2);
  rimB.position.set(1.8, 1.35, -1.7);
  rimB.target.position.set(0.12, 1.0, 0.0);
  scene.add(rimB);
  scene.add(rimB.target);

  const shadowLight = new THREE.DirectionalLight(0xffffff, 0.0);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(1024, 1024);
  shadowLight.shadow.radius = 12;
  shadowLight.shadow.bias = -0.00012;
  shadowLight.shadow.normalBias = 0.025;
  shadowLight.shadow.camera.near = 0.4;
  shadowLight.shadow.camera.far = 14;
  shadowLight.shadow.camera.left = -2.2;
  shadowLight.shadow.camera.right = 2.2;
  shadowLight.shadow.camera.top = 2.2;
  shadowLight.shadow.camera.bottom = -2.2;
  scene.add(shadowLight);
  scene.add(shadowLight.target);
  state.shadowLight = shadowLight;

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.55, color: 0x000000 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.material.depthWrite = false;
  shadowCatcher.material.fog = false;
  scene.add(shadowCatcher);
  state.shadowCatcher = shadowCatcher;

  const reflTarget = new THREE.WebGLRenderTarget(320, 320);
  const reflCam = new THREE.PerspectiveCamera(32, 1, 0.08, 40);
  const reflMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { tRefl: { value: reflTarget.texture }, opacity: { value: 0.18 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform sampler2D tRefl; uniform float opacity; varying vec2 vUv; void main(){ float d=distance(vUv,vec2(0.5,0.62)); float a=smoothstep(0.48,0.05,d)*opacity; vec3 col=texture2D(tRefl,vec2(vUv.x,1.0-vUv.y)).rgb; gl_FragColor=vec4(col,a); }"
  });
  const reflPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), reflMat);
  reflPlane.rotation.x = -Math.PI / 2;
  reflPlane.renderOrder = 2;
  scene.add(reflPlane);
  state.refl = { target: reflTarget, cam: reflCam, plane: reflPlane };

  const { shell, joint } = materials();
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load("assets/apollo-web.glb", (gltf) => {
    if (loaderBar) loaderBar.style.width = "70%";
    const root = gltf.scene;
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const name = obj.name || (obj.parent && obj.parent.name) || "";
      const gltfDark = obj.material && obj.material.color && obj.material.color.r < 0.4;
      const dark = gltfDark || isHandOrFoot(name);
      obj.material = dark ? joint : shell;
      obj.castShadow = true;
      obj.receiveShadow = false;
      try {
        obj.geometry = creaseNormals(obj.geometry);
      } catch (err) {
        console.warn("crease", name, err);
        if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
      }
      obj.geometry.computeBoundingBox();
      const box = obj.geometry.boundingBox;
      const centerLocal = box.getCenter(new THREE.Vector3());
      const center = centerLocal.clone().add(obj.position);
      parts.push({
        name,
        mesh: obj,
        kind: kindOf(name),
        side: sideOf(name),
        dark: !!dark,
        rest: obj.position.clone(),
        centerLocal,
        center,
        out: center.clone().normalize(),
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        goal: new THREE.Vector3(),
        axis: null,
        fan: null,
        rank: 0,
        rankHead: name.includes("neck_pitch") ? 1 : 0,
        finger: 0,
        locked: false,
        mainActuator: isActuator(name),
        delay: name.startsWith("neck_") ? 0 : (kindOf(name) === "arm" ? 0.08 : (kindOf(name) === "body" ? 0.15 : 0.22)),
        age: 0
      });
    });
    scene.add(root);
    buildLayout();
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00383c,
      emissive: new THREE.Color(0x00f5ff),
      emissiveIntensity: 8,
      toneMapped: false,
      roughness: 0.2
    });
    function addLed(part, local, radius) {
      if (!part) return;
      const led = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0026, 8, 18), ledMat);
      led.userData.part = part;
      led.userData.local = local;
      eyes.push(led);
      scene.add(led);
    }
    addLed(findPart("neck_pitch"), new THREE.Vector3(0.105, 0.05, -0.034), 0.012);
    addLed(findPart("neck_pitch"), new THREE.Vector3(0.105, 0.05, 0.034), 0.012);
    parts.forEach((p) => {
      if (!p.mainActuator || p.locked) return;
      if (!/shoulder_aa|elbow_fe|hip_fe|knee_fe|neck_yaw/.test(p.name)) return;
      addLed(p, new THREE.Vector3(0.02, 0.0, p.side * 0.02), 0.014);
    });
    let minY = Infinity;
    parts.forEach((p) => {
      const y = p.rest.y + p.mesh.geometry.boundingBox.min.y;
      if (y < minY) minY = y;
    });
    floorY = Number.isFinite(minY) ? minY + 0.004 : 0;
    shadowCatcher.position.y = floorY;
    if (loaderBar) loaderBar.style.width = "100%";
    const world = new THREE.Box3().setFromObject(root);
    document.documentElement.classList.add("is-ready");
    state.ready = true;
    state.count = parts.length;
    state.bounds = {
      min: world.min.toArray().map((n) => Number(n.toFixed(3))),
      max: world.max.toArray().map((n) => Number(n.toFixed(3)))
    };
    makeTitle();
    enterHero(true);
    window.__apollo = state;
  }, (ev) => {
    if (loaderBar && ev.total) loaderBar.style.width = Math.round(ev.loaded / ev.total * 60) + "%";
  }, () => {
    const fail = document.getElementById("fail");
    if (fail) fail.hidden = false;
    document.getElementById("loader").hidden = true;
  });

  console.log("composer:start");
  try {
    composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0
    });
    const ao = new N8AOPostPass(scene, camera, window.innerWidth, window.innerHeight);
    ao.configuration.screenSpaceRadius = true;
    ao.configuration.aoRadius = phone() ? 16 : 22;
    ao.configuration.distanceFalloff = 0.22;
    ao.configuration.intensity = 5;
    ao.configuration.halfRes = phone();
    ao.configuration.color = new THREE.Color(0x000000);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(ao);
    const bloomEffect = new BloomEffect({
      luminanceThreshold: 3.4,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
      intensity: 1.35,
      radius: 0.42,
      levels: 5
    });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    composer.addPass(new EffectPass(camera, bloomEffect, new SMAAEffect({ preset: SMAAPreset.HIGH }), tone));
    bloom = { enabled: true };
    state.post = "n8ao+bloom+smaa";
    console.log("composer:ok");
  } catch (err) {
    console.warn("post", err);
    composer = null;
    bloom = null;
    renderer.shadowMap.enabled = true;
    state.post = "fallback";
  }
  resize();
  bindInput();
  requestAnimationFrame(tick);
}

try {
  boot();
} catch (err) {
  const fail = document.getElementById("fail");
  if (fail) {
    fail.hidden = false;
    fail.textContent = "WebGL недоступен.";
  }
  console.error(err);
}

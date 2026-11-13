import * as THREE from "three";
import { MOTION } from "./config.js";

const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
function dampAngle(a, b, l, dt) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-l * dt));
}

// Одна камера на весь фильм. Никаких «сцен» и cut'ов: только цель (radius/phi/theta/look) и сглаживание к ней.
export function createRig(camera, canvas, still) {
  const s = {
    radius: 6.4, phi: 1.02, theta: -0.55, look: new THREE.Vector3(0, 1.25, 0),
    target: { radius: 3.05, phi: 1.16, theta: 0.62, look: new THREE.Vector3(0, 0.9, 0) },
    dragTheta: 0, dragPhi: 0, yawVel: 0, phiVel: 0, pinch: 1, orbit: 0, t: 0, dragging: false,
    locked: false // true во время интро: GSAP ведёт s.radius/phi/theta напрямую
  };
  const pointers = new Map();
  let pinchDist = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.dragging = true;
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) s.pinch = THREE.MathUtils.clamp(s.pinch * (pinchDist / d), ...MOTION.pinchClamp);
      pinchDist = d;
      return;
    }
    s.dragTheta -= dx * 0.0052;
    s.dragPhi -= dy * 0.0032;
    s.yawVel = -dx * 0.035;
    s.phiVel = -dy * 0.02;
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (!pointers.size) s.dragging = false;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  // phone: объект уходит в нижние ~64% кадра, верхняя полоса (36%) — под callout'ы. Без этого карточки лягут на голову.
  function setTarget(t, phone = false, radiusMul = 1) {
    s.target.radius = t.radius * radiusMul;
    s.target.phi = t.phi;
    s.target.theta = t.theta;
    s.target.look.fromArray(t.look);
    if (phone) {
      const visibleH = 2 * s.target.radius * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      s.target.look.y += visibleH * (t.phoneLift ?? 0.17);
    }
  }

  function update(dt) {
    const L = still ? 80 : MOTION.camLambda;
    if (!s.locked) {
      s.radius = damp(s.radius, s.target.radius, L, dt);
      s.phi = damp(s.phi, s.target.phi, L, dt);
      s.theta = dampAngle(s.theta, s.target.theta, L, dt);
      s.look.lerp(s.target.look, 1 - Math.exp(-L * dt));
    }
    if (!still && !s.dragging) { s.t += dt; s.orbit += dt * MOTION.drift.orbit; }
    s.dragTheta += s.yawVel * dt;
    s.dragPhi += s.phiVel * dt;
    const k = Math.exp(-MOTION.inertia * dt);
    s.yawVel *= k; s.phiVel *= k;
    const bob = still ? 0 : Math.sin(s.t * MOTION.drift.bobHz) * MOTION.drift.bobAmp;
    const breathe = still ? 0 : Math.sin(s.t * MOTION.drift.breatheHz) * MOTION.drift.breatheAmp;
    const phi = THREE.MathUtils.clamp(s.phi + s.dragPhi + bob, ...MOTION.phiClamp);
    const r = THREE.MathUtils.clamp((s.radius + breathe) * s.pinch, ...MOTION.radiusClamp);
    const th = s.theta + s.dragTheta + (still ? 0 : s.orbit);
    camera.position.set(
      s.look.x + r * Math.sin(phi) * Math.sin(th),
      s.look.y + r * Math.cos(phi),
      s.look.z + r * Math.sin(phi) * Math.cos(th)
    );
    camera.lookAt(s.look);
    camera.updateMatrixWorld();
    return Math.abs(s.radius - s.target.radius) * 0.2 + s.look.distanceTo(s.target.look);
  }

  return { state: s, setTarget, update };
}

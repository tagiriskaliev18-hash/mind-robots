import * as THREE from "three";
import { MOTION, PHONE_EXPLODE } from "./config.js";

const force = new THREE.Vector3();

// Каскадный коэффициент вдоль кинематической цепи: звенья одной конечности расходятся ступенями, а не единым куском.
export function chainFactor(name) {
  if (/hand|dex3|palm|thumb|index|middle/i.test(name)) return 1.32;
  if (/wrist_yaw/i.test(name)) return 1.14;
  if (/wrist_pitch/i.test(name)) return 1.0;
  if (/wrist_roll/i.test(name)) return 0.88;
  if (/elbow/i.test(name)) return 0.72;
  if (/shoulder_yaw/i.test(name)) return 0.56;
  if (/shoulder_roll/i.test(name)) return 0.42;
  if (/shoulder_pitch/i.test(name)) return 0.26;
  if (/ankle_roll|foot/i.test(name)) return 1.28;
  if (/ankle_pitch/i.test(name)) return 1.08;
  if (/knee/i.test(name)) return 0.82;
  if (/hip_yaw/i.test(name)) return 0.58;
  if (/hip_roll/i.test(name)) return 0.4;
  if (/hip_pitch/i.test(name)) return 0.24;
  if (/pelvis_contour/i.test(name)) return 1.18;
  if (/^pelvis$/i.test(name)) return 0.62;
  if (/waist_yaw/i.test(name)) return 1.0;
  if (/waist_roll/i.test(name)) return 0.55;
  return 1.0;
}

// Полу-неявный Эйлер, dt зажат в [1 мс, 33 мс] — стабилен при k=70, c=9.6.
export function springStep(p, dt, still) {
  if (still) {
    p.pos.copy(p.goal);
    p.vel.set(0, 0, 0);
  } else {
    p.age += dt;
    const open = p.age < p.delay ? 0 : 1;
    force.copy(p.goal).multiplyScalar(open).sub(p.pos).multiplyScalar(MOTION.spring.k).addScaledVector(p.vel, -MOTION.spring.c);
    p.vel.addScaledVector(force, dt);
    p.pos.addScaledVector(p.vel, dt);
  }
  p.mesh.position.copy(p.rest).add(p.pos);
}

export function setGoals(parts, tab, phone = false) {
  const lat = phone ? PHONE_EXPLODE.lateral : 1;
  const ver = phone ? PHONE_EXPLODE.vertical : 1;
  for (const p of parts) {
    const off = tab?.explode?.[p.group];
    const m = p.chain ?? 1;
    p.goal.set(
      off ? off[0] * lat * m : 0,
      off ? off[1] * ver * m : 0,
      off ? off[2] * lat * m : 0
    );
    p.age = 0; // перезапуск stagger-волны; скорость НЕ обнуляем — импульс продолжается
  }
}

// Насколько система ещё «в пути»: решает, когда показывать подписи.
export function settleError(parts) {
  let max = 0;
  for (const p of parts) max = Math.max(max, p.pos.distanceTo(p.goal), p.vel.length() * 0.35);
  return max;
}

// Для таба «Разбор»: подобрать radius и look так, чтобы разобранный объект занял 84% кадра (62% на телефоне).
export function fitExploded(parts, camera, tab, phone = false) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const p of parts) {
    v.copy(p.rest).add(p.centerLocal).add(p.goal);
    box.expandByPoint(v);
  }
  box.expandByScalar(0.14);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.45, camera.aspect));
  const fill = phone ? 0.62 : 0.73;
  const distY = (size.y / 2) / Math.tan(vFov / 2) / fill;
  const distX = (Math.hypot(size.x, size.z) * (phone ? 0.82 : 0.62) / 2) / Math.tan(hFov / 2) / fill;
  tab.radius = Math.max(distY, distX);
  if (!phone) center.y += 0.05;
  tab.look = center.toArray();
}

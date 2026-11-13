import * as THREE from "three";
import { PRODUCT, PALETTE } from "./config.js";

// Заголовок — НЕ DOM поверх канваса, а плоскость в сцене за объектом (depthWrite:false, renderOrder 1).
// Объект перекрывает буквы по глубине => типографика «внутри» кадра. На телефоне 3D-заголовок не рисуем (не влезает за объект).
export function createTitle(scene, gsap, still) {
  const c = document.createElement("canvas");
  c.width = 1800; c.height = 720;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, fog: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.98), mat);
  plane.renderOrder = 1;
  plane.visible = false;
  scene.add(plane);
  const slide = { v: 0.28 };
  const [l1, word, l3] = PRODUCT.titleLines;

  function paint() {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = PALETTE.ink;
    ctx.textBaseline = "middle";
    ctx.font = `500 86px ${PRODUCT.titleFont}, sans-serif`;
    ctx.textAlign = "left";  ctx.fillText(l1, 36, 78);
    ctx.textAlign = "right"; ctx.fillText(l3, c.width - 36, 78);
    ctx.textAlign = "center";
    ctx.font = `500 196px ${PRODUCT.titleFont}, sans-serif`;
    ctx.fillText(word, c.width / 2, 470);
    tex.needsUpdate = true;
  }
  paint();
  // Перерисовать, когда Geist реально загрузится. Иначе канвас навсегда запечёт fallback-шрифт.
  document.fonts?.load(`500 196px ${PRODUCT.titleFont}`).then(paint).catch(() => {});

  const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3();
  function update(camera, anchorY, phone) {
    if (phone || mat.opacity < 0.01) { plane.visible = false; return; }
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    back.setFromMatrixColumn(camera.matrixWorld, 2);
    plane.quaternion.copy(camera.quaternion);   // всегда лицом к камере, но в глубине сцены
    plane.scale.setScalar(1.22);
    plane.position.set(0, anchorY, 0).addScaledVector(back, -0.52).addScaledVector(up, slide.v);
    plane.visible = true;
  }

  function set(on) {
    gsap?.killTweensOf(mat); gsap?.killTweensOf(slide);
    if (still || !gsap) { mat.opacity = on ? 1 : 0; slide.v = 0; return; }
    if (on) { slide.v = 0.28; gsap.to(mat, { opacity: 1, duration: 0.9, ease: "expo.out" }); gsap.to(slide, { v: 0, duration: 0.9, ease: "expo.out" }); }
    else { gsap.to(mat, { opacity: 0, duration: 0.55, ease: "expo.out" }); gsap.to(slide, { v: 0.42, duration: 0.55, ease: "expo.out" }); }
  }

  return { plane, mat, set, update, get visible() { return plane.visible && mat.opacity > 0.04; } };
}

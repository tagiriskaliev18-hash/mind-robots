import * as THREE from "three";
import { PRODUCT, PALETTE } from "./config.js";

// Заголовок — НЕ DOM поверх канваса, а плоскость в сцене ЗА объектом (depthWrite:false, renderOrder 1).
// Объект перекрывает буквы по глубине => типографика принадлежит 3D-пространству.
export function createTitle(scene, gsap, still) {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = 720;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
    fog: false
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.98), mat);
  plane.renderOrder = 1;
  plane.visible = false;
  scene.add(plane);
  const slide = { v: 0.24 };
  const [l1, word, l3] = PRODUCT.titleLines;

  function paint() {
    ctx.clearRect(0, 0, c.width, c.height);
    // Мягкий студийный спад яркости сверху вниз — согласован с верхним key-светом сцены (без свечения и ниже порога bloom 3.4).
    const topFill = ctx.createLinearGradient(0, 24, 0, 132);
    topFill.addColorStop(0, PALETTE.ink);
    topFill.addColorStop(1, "rgba(218, 215, 226, 0.82)");
    ctx.fillStyle = topFill;
    ctx.textBaseline = "middle";
    ctx.font = `500 84px "${PRODUCT.titleFont}", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(l1, 40, 82);
    ctx.textAlign = "right";
    ctx.fillText(l3, c.width - 40, 82);

    const mainFill = ctx.createLinearGradient(0, 340, 0, 580);
    mainFill.addColorStop(0, PALETTE.ink);
    mainFill.addColorStop(1, "rgba(206, 203, 216, 0.84)");
    ctx.fillStyle = mainFill;
    ctx.textAlign = "center";
    ctx.font = `500 192px "${PRODUCT.titleFont}", sans-serif`;
    ctx.fillText(word, c.width / 2, 468);
    tex.needsUpdate = true;
  }

  paint();
  Promise.all([
    document.fonts?.load(`500 84px "${PRODUCT.titleFont}"`),
    document.fonts?.load(`500 192px "${PRODUCT.titleFont}"`)
  ]).then(() => document.fonts?.ready).then(paint).catch(() => {});

  const up = new THREE.Vector3(), back = new THREE.Vector3();
  const planeScale = PRODUCT.titleScale ?? 0.98;
  const planeDepth = PRODUCT.titleDepth ?? -0.44;

  function update(camera, anchorY, phone) {
    if (mat.opacity < 0.01) {
      plane.visible = false;
      return;
    }
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    back.setFromMatrixColumn(camera.matrixWorld, 2);
    plane.quaternion.copy(camera.quaternion);
    const y = phone ? anchorY + 0.34 : anchorY;
    plane.position.set(0, y, 0).addScaledVector(back, planeDepth).addScaledVector(up, slide.v);
    if (phone) {
      const dist = camera.position.distanceTo(plane.position);
      const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
      plane.scale.setScalar(Math.min(planeScale, (visW * 0.88) / 2.45));
    } else {
      plane.scale.setScalar(planeScale);
    }
    plane.visible = true;
  }

  function set(on) {
    gsap?.killTweensOf(mat);
    gsap?.killTweensOf(slide);
    if (still || !gsap) {
      mat.opacity = on ? 1 : 0;
      slide.v = 0;
      return;
    }
    if (on) {
      slide.v = 0.24;
      gsap.to(mat, { opacity: 1, duration: 0.9, ease: "expo.out" });
      gsap.to(slide, { v: 0, duration: 0.9, ease: "expo.out" });
    } else {
      gsap.to(mat, { opacity: 0, duration: 0.55, ease: "expo.out" });
      gsap.to(slide, { v: 0.34, duration: 0.55, ease: "expo.out" });
    }
  }

  return { plane, mat, set, update, get visible() { return plane.visible && mat.opacity > 0.04; } };
}

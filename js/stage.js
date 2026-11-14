import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { PALETTE, QUALITY, PRODUCT } from "./config.js";

export const isPhone = () => matchMedia("(max-width: 700px)").matches;

export function createStage(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = new THREE.FogExp2(PALETTE.bg, QUALITY.fog);

  const camera = new THREE.PerspectiveCamera(QUALITY.fov, innerWidth / innerHeight, QUALITY.near, QUALITY.far);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(PALETTE.bg, 1);

  // Окружение: загружаем HDRI напрямую асинхронно (без синхронного double-bake RoomEnvironment, тормозящего Акт I).
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envReady = false;
  new RGBELoader().load(PRODUCT.hdri, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const oldEnv = scene.environment;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    scene.environmentIntensity = QUALITY.envIntensity;
    scene.environmentRotation.y = QUALITY.envRotationY;
    tex.dispose();
    if (oldEnv) oldEnv.dispose();
    pmrem.dispose();
    envReady = true;
    dispatchEvent(new Event("stage:dirty"));
  }, undefined, () => {
    if (!envReady) {
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = QUALITY.envIntensity;
      scene.environmentRotation.y = QUALITY.envRotationY;
      pmrem.dispose();
      dispatchEvent(new Event("stage:dirty"));
    }
    console.warn("hdri: fallback RoomEnvironment");
  });

  // Свет: тёплый нейтральный key сверху-справа, мягкий fill, два узких rim-прожектора палитры Mind на силуэт 1.32 м.
  scene.add(new THREE.HemisphereLight(0xf2f0ea, 0x101014, 0.16));
  const key = new THREE.DirectionalLight(0xffffff, 3.6);
  key.position.set(2.4, 5.4, 3.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe7e4de, 0.28);
  fill.position.set(-2.4, 1.6, 2.2);
  scene.add(fill);

  const rimV = new THREE.SpotLight(PALETTE.violet, 7, 8, 0.18, 0.85, 1.2);
  rimV.position.set(-1.7, 1.7, -1.9);
  rimV.target.position.set(-0.12, 0.92, 0.04);
  scene.add(rimV, rimV.target);

  const rimB = new THREE.SpotLight(PALETTE.blue, 5, 8, 0.16, 0.9, 1.2);
  rimB.position.set(1.8, 1.35, -1.7);
  rimB.target.position.set(0.1, 0.8, 0);
  scene.add(rimB, rimB.target);

  // Контактное заземление: только лёгкий радиальный спрайт под стопами (без лишнего ShadowMaterial 6x6 прохода).
  const shadowLight = new THREE.DirectionalLight(0xffffff, 0);
  shadowLight.castShadow = false;
  scene.add(shadowLight, shadowLight.target);

  const catcher = new THREE.Group();
  catcher.rotation.x = -Math.PI / 2;
  scene.add(catcher);
  catcher.add(makeBlob());

  // Прямой 1-pass рендер с аппаратным MSAA и AgX ToneMapping (0 копирований HalfFloat FBO); мягкое свечение циан-ламп даёт аддитивный спрайт в addLamp().
  let quality = 1;
  function resize() {
    const cap = isPhone() ? 1.15 : QUALITY.dprDesktop;
    let dpr = Math.min(devicePixelRatio || 1, cap);
    if (quality < 1) dpr = Math.min(dpr, quality < 0.5 ? QUALITY.dprMin : QUALITY.dprLow);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  // Адаптивное качество: среднее за 45 кадров > 22 мс => ступенчатое снижение DPR без потери тональной карты или AA.
  const samples = [];
  function adapt(dt) {
    samples.push(dt);
    if (samples.length < QUALITY.sampleFrames) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples.length = 0;
    if (avg * 1000 > QUALITY.budgetMs && quality > 0.45) {
      quality *= QUALITY.downStep;
      resize();
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, shadowLight, catcher, render, adapt, resize, get quality() { return quality; } };
}

function makeBlob() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.72)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.34)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 1.85),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false })
  );
  m.position.z = 0.001;
  m.renderOrder = 1;
  return m;
}

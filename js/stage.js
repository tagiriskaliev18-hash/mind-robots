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
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(PALETTE.bg, 1);

  // Окружение: загружаем HDRI напрямую асинхронно (без синхронного PMREM на старте Act I).
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

  // Свет под масштаб 1.73 м Apptronik Apollo: чистый key сверху-справа, мягкий fill, Mind rim-прожекторы.
  scene.add(new THREE.HemisphereLight(0xf2f0ea, 0x101014, 0.22));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(2.8, 5.8, 3.4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe7e4de, 0.34);
  fill.position.set(-2.6, 2.0, 2.4);
  scene.add(fill);

  const rimV = new THREE.SpotLight(PALETTE.violet, 8.5, 9, 0.22, 0.85, 1.2);
  rimV.position.set(-2.0, 2.1, -2.1);
  rimV.target.position.set(-0.12, 1.12, 0.04);
  scene.add(rimV, rimV.target);

  const rimB = new THREE.SpotLight(PALETTE.blue, 6.2, 9, 0.20, 0.9, 1.2);
  rimB.position.set(2.1, 1.65, -1.9);
  rimB.target.position.set(0.1, 0.96, 0);
  scene.add(rimB, rimB.target);

  // Контактное заземление: лёгкий радиальный градиент под стопами (0 проходов ShadowMap/N8AO на телефоне и десктопе).
  const shadowLight = new THREE.DirectionalLight(0xffffff, 0);
  shadowLight.castShadow = false;
  scene.add(shadowLight, shadowLight.target);

  const catcher = new THREE.Group();
  catcher.rotation.x = -Math.PI / 2;
  scene.add(catcher);
  catcher.add(makeBlob());

  // 1-pass рендер с аппаратным MSAA и встроенным AgXToneMapping (никогда не отключается в adapt()).
  let quality = 1;
  function resize() {
    const cap = isPhone() ? QUALITY.dprPhone : QUALITY.dprDesktop;
    let dpr = Math.min(devicePixelRatio || 1, cap);
    if (quality < 1) dpr = Math.min(dpr, quality < 0.5 ? QUALITY.dprMin : QUALITY.dprLow);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  // Адаптивное качество: среднее за 30 кадров > 20 мс => ступенчатое снижение DPR без потери тональной карты/AA.
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
  grd.addColorStop(0, "rgba(0,0,0,0.74)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.34)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 2.15),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false })
  );
  m.position.z = 0.001;
  m.renderOrder = 1;
  return m;
}

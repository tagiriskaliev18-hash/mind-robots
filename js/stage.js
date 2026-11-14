import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { PALETTE, QUALITY, PRODUCT } from "./config.js";

export const isPhone = () => matchMedia("(max-width: 700px)").matches;

export function createStage(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = new THREE.FogExp2(PALETTE.bg, QUALITY.fog);

  const camera = new THREE.PerspectiveCamera(QUALITY.fov, innerWidth / innerHeight, QUALITY.near, QUALITY.far);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // тонмаппинг делает ToneMappingEffect (AgX) в конце цепочки
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(PALETTE.bg, 1);

  // Окружение: мгновенный RoomEnvironment, затем реальный HDRI через PMREM.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = QUALITY.envIntensity;
  scene.environmentRotation.y = QUALITY.envRotationY;
  new RGBELoader().load(PRODUCT.hdri, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    scene.environmentIntensity = QUALITY.envIntensity;
    scene.environmentRotation.y = QUALITY.envRotationY;
    tex.dispose();
  }, undefined, () => console.warn("hdri: fallback RoomEnvironment"));

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

  // Контактная тень: невидимый shadow-only свет + ShadowMaterial + мягкое радиальное пятно.
  const shadowLight = new THREE.DirectionalLight(0xffffff, 0);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(1024, 1024);
  shadowLight.shadow.radius = 12;
  shadowLight.shadow.bias = -0.00012;
  shadowLight.shadow.normalBias = 0.025;
  Object.assign(shadowLight.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.4, far: 14 });
  scene.add(shadowLight, shadowLight.target);

  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.55, depthWrite: false })
  );
  catcher.material.fog = false;
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  scene.add(catcher);
  catcher.add(makeBlob());

  // Пост-обработка: RenderPass -> N8AO -> один EffectPass(Bloom, SMAA HIGH, ToneMapping AGX).
  let composer = null;
  let bloomOn = true;
  try {
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const isSafari = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg/i.test(navigator.userAgent);
    if (!isSafari) {
      const ao = new N8AOPostPass(scene, camera, innerWidth, innerHeight);
      Object.assign(ao.configuration, {
        screenSpaceRadius: true,
        aoRadius: isPhone() ? QUALITY.ao.radiusPhone : QUALITY.ao.radiusDesk,
        aoSamples: isPhone() ? 4 : 8,
        denoiseSamples: 4,
        distanceFalloff: QUALITY.ao.distanceFalloff,
        intensity: QUALITY.ao.intensity,
        halfRes: true,
        color: new THREE.Color(0x000000)
      });
      composer.addPass(ao);
    }
    const bloom = new BloomEffect({ ...QUALITY.bloom, mipmapBlur: true });
    composer.addPass(new EffectPass(
      camera,
      bloom,
      new SMAAEffect({ preset: isPhone() ? SMAAPreset.MEDIUM : SMAAPreset.HIGH }),
      new ToneMappingEffect({ mode: ToneMappingMode.AGX })
    ));
  } catch (err) {
    console.warn("post: fallback", err);
    composer = null;
    renderer.toneMapping = THREE.AgXToneMapping;
  }

  let quality = 1;
  function resize() {
    const cap = isPhone() ? QUALITY.dprPhone : QUALITY.dprDesktop;
    let dpr = Math.min(devicePixelRatio || 1, cap);
    if (quality < 1) dpr = Math.min(dpr, quality < 0.5 ? QUALITY.dprMin : QUALITY.dprLow);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(innerWidth, innerHeight);
  }
  resize();
  addEventListener("resize", resize);

  // Адаптивное качество: среднее за 45 кадров > 22 мс => DPR вниз, затем отключение композера.
  const samples = [];
  function adapt(dt) {
    samples.push(dt);
    if (samples.length < QUALITY.sampleFrames) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples.length = 0;
    if (avg * 1000 > QUALITY.budgetMs && quality > 0.4) {
      quality *= QUALITY.downStep;
      if (quality < 0.5) {
        bloomOn = false;
        renderer.toneMapping = THREE.AgXToneMapping;
      }
      resize();
    }
  }

  function render(dt) {
    if (composer && bloomOn) {
      try {
        composer.render(dt);
        return;
      } catch (err) {
        console.warn("composer", err);
        composer = null;
        renderer.toneMapping = THREE.AgXToneMapping;
      }
    }
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, shadowLight, catcher, render, adapt, resize, get quality() { return quality; } };
}

function makeBlob() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false })
  );
  m.position.z = 0.001;
  m.renderOrder = 1;
  return m;
}

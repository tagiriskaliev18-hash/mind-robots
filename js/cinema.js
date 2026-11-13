/**
 * MIND ROBOTICS — CINEMATIC 3D ENGINE
 * Real-time Three.js + AgX Tone Mapping + Selective Bloom + Spring Exploded View + LiDAR Matrix + Web Audio SFX
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==========================================================================
   WEB AUDIO API — PROCEDURAL SFX SYNTHESIZER
   ========================================================================== */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('mind_sfx_muted') === 'true';
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('mind_sfx_muted', String(this.muted));
    return this.muted;
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playLaserScan() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.35);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSubHum() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.4);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

const audio = new AudioEngine();

/* ==========================================================================
   CINEMATIC DIRECTOR ACTS CONFIGURATION
   ========================================================================== */
const DIRECTOR_ACTS = [
  {
    id: 'hero',
    name: '01 // HERO CINEMA',
    camera: { radius: 3.15, phi: 1.18, theta: 0.62, lookY: 0.95, fov: 32 },
    showType: true,
    callouts: [],
    laser: false
  },
  {
    id: 'optics',
    name: '02 // OPTICS & VISOR',
    camera: { radius: 0.95, phi: 1.28, theta: 1.35, lookY: 1.68, fov: 25 },
    showType: false,
    laser: true,
    callouts: [
      { part: 'neck_pitch', title: 'Оптический визор', metric: '4K Stereo', desc: 'Бинокулярная камера с HDR и глубиной резкости 120°.', ox: 0.08, oy: 0.04, oz: 0 },
      { part: 'neck_yaw', title: 'LiDAR модуль', metric: '128-ch', desc: 'Лазерный сканер окружения с частотой 30 Гц.', ox: 0.02, oy: 0.01, oz: 0.05 },
      { part: 'torso_link__4', title: 'Микрофонный массив', metric: 'Beamforming', desc: 'Пространственное выделение голоса оператора в шуме цеха.', ox: 0.12, oy: 0.06, oz: 0 }
    ]
  },
  {
    id: 'torque',
    name: '03 // HARMONIC DRIVE',
    camera: { radius: 1.25, phi: 1.28, theta: 2.45, lookY: 1.18, fov: 28 },
    showType: false,
    laser: false,
    callouts: [
      { part: 'l_shoulder_aa', title: 'Сервопривод плеча', metric: '180 Н·м', desc: 'Гармонический безлюфтовый редуктор высокой удельной мощности.', ox: 0.02, oy: 0.03, oz: -0.04 },
      { part: 'torso_link__7', title: 'Силовая шина', metric: '48.2 В', desc: 'Высокотоковый импульсный контроллер с жидкостным теплоотводом.', ox: 0.05, oy: 0.01, oz: 0 },
      { part: 'l_elbow', title: 'Датчик момента', metric: '1000 Гц', desc: 'Обратная связь по усилию для безопасной коллаборации с человеком.', ox: 0.01, oy: 0, oz: -0.03 }
    ]
  },
  {
    id: 'exploded',
    name: '04 // HYALOS TEARDOWN',
    camera: { radius: 4.4, phi: 1.16, theta: 0.65, lookY: 1.1, fov: 36 },
    showType: false,
    laser: false,
    callouts: [
      { part: 'neck_pitch', title: 'Шлем и сенсорика', metric: 'Модуль A1', desc: 'Съемный сенсорный блок на быстросъемном байонете.', ox: 0.08, oy: 0.48, oz: 0 },
      { part: 'l_shoulder_fe', title: 'Кинематическая рука', metric: '7 DOF', desc: 'Полная свобода движений человеческой руки с точным хватом.', ox: 0, oy: 0.05, oz: -0.25 },
      { part: 'l_knee', title: 'Опорная колонна', metric: '25 кг Max', desc: 'Титановый силовой каркас бедра с амортизацией ударных нагрузок.', ox: 0.03, oy: 0.05, oz: -0.15 }
    ]
  },
  {
    id: 'lidar',
    name: '05 // NEURAL MATRIX',
    camera: { radius: 2.85, phi: 1.15, theta: 0.95, lookY: 0.95, fov: 34 },
    showType: false,
    laser: true,
    callouts: [
      { part: 'torso_link__4', title: 'VLA Интеллект', metric: 'OpenVLA / π0', desc: 'Прямой перевод зрительного кадра и команды в траекторию суставов.', ox: 0.12, oy: 0.08, oz: 0 },
      { part: 'base_link', title: 'Баланс и походка', metric: 'Model Predictive', desc: 'Динамический расчет центра масс и реакций опоры в реальном времени.', ox: 0.08, oy: 0.02, oz: 0 }
    ]
  },
  {
    id: 'specs',
    name: '06 // SPECIFICATION',
    camera: { radius: 3.65, phi: 1.22, theta: 0.45, lookY: 0.92, fov: 32 },
    showType: false,
    laser: false,
    callouts: [
      { part: 'neck_pitch', title: 'Габаритный рост', metric: '1.70 м', desc: 'Антропоморфный форм-фактор для работы в существующей инфраструктуре.', ox: 0.1, oy: 0.04, oz: 0 },
      { part: 'base_link', title: 'Снаряженная масса', metric: '73 кг', desc: 'Оптимизированный центр тяжести для повышенной устойчивости.', ox: 0.08, oy: 0.02, oz: 0 },
      { part: 'torso_link__7', title: 'Сменная батарея', metric: '4.0 ч', desc: 'Горячая замена энергоблока без выключения бортовых компьютеров.', ox: 0.06, oy: 0, oz: 0.02 }
    ]
  }
];

/* ==========================================================================
   APP STATE
   ========================================================================== */
const state = {
  actIndex: 0,
  act: DIRECTOR_ACTS[0],
  radius: DIRECTOR_ACTS[0].camera.radius,
  phi: DIRECTOR_ACTS[0].camera.phi,
  theta: DIRECTOR_ACTS[0].camera.theta,
  lookY: DIRECTOR_ACTS[0].camera.lookY,
  fov: DIRECTOR_ACTS[0].camera.fov,
  
  dragTheta: 0,
  dragPhi: 0,
  velTheta: 0,
  velPhi: 0,
  isDragging: false,
  
  manualExplode: 0,
  isLiDARMode: false,
  isLaserActive: false,
  dpr: Math.min(window.devicePixelRatio || 1, 2)
};

/* ==========================================================================
   INITIALIZATION & SETUP
   ========================================================================== */
const stage = document.getElementById('stage');
const leadersSvg = document.getElementById('leaders');
const calloutsContainer = document.getElementById('calloutsContainer');
const volumetricType = document.getElementById('heroType');
const laserOverlay = document.getElementById('laserOverlay');
const loader = document.getElementById('cinemaLoader');
const loaderFill = document.getElementById('loaderFill');
const loaderText = document.getElementById('loaderText');
const btnAudio = document.getElementById('btnAudio');
const btnLidar = document.getElementById('btnLidar');
const btnReset = document.getElementById('btnReset');
const zoomSlider = document.getElementById('zoomSlider');
const explodeSlider = document.getElementById('explodeSlider');
const modeTabs = document.getElementById('modeTabs');
const hudCoords = document.getElementById('hudCoords');

let scene, camera, renderer, composer, bloomPass;
let robotGroup = new THREE.Group();
let robotParts = [];
let materials = { ceramic: null, graphite: null, glass: null, emissiveCyan: null, wireframe: null };
let floorMesh, lidarRingMesh;

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090f);
  scene.fog = new THREE.FogExp2(0x09090f, 0.035);

  camera = new THREE.PerspectiveCamera(state.fov, window.innerWidth / window.innerHeight, 0.1, 50);
  
  renderer = new THREE.WebGLRenderer({
    canvas: stage,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(state.dpr);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Postprocessing: RenderPass + UnrealBloomPass + OutputPass
  const renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.75, // Bloom strength
    0.42, // Radius
    0.85  // Threshold (only intense cyan emissives bloom)
  );
  const outputPass = new OutputPass();

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  setupLighting();
  setupEnvironment();
  setupFloor();
  setupMaterials();
  buildModeTabs();
  setupInteractions();
  loadApolloModel();

  window.addEventListener('resize', onResize);
}

/* ==========================================================================
   CINEMATIC LIGHTING (MIND DRAMA PALETTE)
   ========================================================================== */
let keyLight, leftVioletRim, rightAzureRim, topIndigoRim;

function setupLighting() {
  // Ambient fill
  const ambient = new THREE.AmbientLight(0x0f111a, 1.2);
  scene.add(ambient);

  // Key light: neutral white 5600K
  keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(2.5, 4.5, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Left Rim Light: Electric Violet #7B2FF7
  leftVioletRim = new THREE.DirectionalLight(0x7b2ff7, 3.6);
  leftVioletRim.position.set(-3.5, 2.5, -2.5);
  scene.add(leftVioletRim);

  // Right Rim Light: Cyber Azure #1E90FF
  rightAzureRim = new THREE.DirectionalLight(0x1e90ff, 3.2);
  rightAzureRim.position.set(3.5, 2.8, -2.0);
  scene.add(rightAzureRim);

  // Top Rim: Deep Indigo #4B3BFF
  topIndigoRim = new THREE.DirectionalLight(0x4b3bff, 1.8);
  topIndigoRim.position.set(0, 5.0, -2.0);
  scene.add(topIndigoRim);
}

function setupEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new RGBELoader().load('assets/hdri/studio_small_09_1k.hdr', (texture) => {
    const envMap = pmrem.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    pmrem.dispose();
  });
}

function setupFloor() {
  // Fading dark contact floor with grid
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x07070b,
    roughness: 0.65,
    metalness: 0.2
  });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Concentric LiDAR Radar Rings on Floor
  const ringGeo = new THREE.RingGeometry(0.3, 2.8, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });
  lidarRingMesh = new THREE.Mesh(ringGeo, ringMat);
  lidarRingMesh.rotation.x = -Math.PI / 2;
  lidarRingMesh.position.y = 0.005;
  lidarRingMesh.visible = false;
  scene.add(lidarRingMesh);
}

/* ==========================================================================
   MATERIALS & SHADERS
   ========================================================================== */
function setupMaterials() {
  // Satin White Ceramic Shell
  materials.ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.36,
    metalness: 0.05,
    clearcoat: 0.52,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15
  });

  // Dark Graphite Anodized Structural Skeleton
  materials.graphite = new THREE.MeshStandardMaterial({
    color: 0x181a22,
    roughness: 0.45,
    metalness: 0.72,
    envMapIntensity: 1.0
  });

  // Visor Optical Glass
  materials.glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a0c14,
    roughness: 0.12,
    metalness: 0.2,
    transmission: 0.85,
    transparent: true,
    opacity: 0.95
  });

  // Laser Cyan Emissive (Lamps, Eyes & Visor Sensors)
  materials.emissiveCyan = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    emissive: 0x00f5ff,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });

  // Holographic LiDAR Wireframe Matrix
  materials.wireframe = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.75
  });
}

/* ==========================================================================
   APOLLO MODEL LOADER & PART PARSING
   ========================================================================== */
function loadApolloModel() {
  loaderText.textContent = 'ЗАГРУЗКА 3D АССЕТОВ...';
  loaderFill.style.width = '35%';

  const loaderGltf = new GLTFLoader();
  loaderGltf.load(
    'assets/apollo-web.glb',
    (gltf) => {
      loaderFill.style.width = '85%';
      loaderText.textContent = 'ИНИЦИАЛИЗАЦИЯ КИНЕМАТИКИ...';

      const model = gltf.scene;
      scene.add(robotGroup);
      robotGroup.add(model);

      parseParts(model);

      loaderFill.style.width = '100%';
      setTimeout(() => {
        loader.classList.add('hidden');
        applyAct(0);
        audio.playSubHum();
      }, 400);
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 70);
        loaderFill.style.width = `${percent}%`;
      }
    },
    (err) => {
      console.error('Error loading Apollo:', err);
      loaderText.textContent = 'ОШИБКА ЗАГРУЗКИ. ОБНОВИТЕ СТРАНИЦУ.';
    }
  );
}

function parseParts(model) {
  robotParts = [];
  
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;

      const name = (node.name || '').toLowerCase();
      let assignedMat = materials.ceramic;
      
      if (name.includes('neck_pitch') || name.includes('visor') || name.includes('eye')) {
        assignedMat = materials.emissiveCyan;
      } else if (name.includes('wrist') || name.includes('finger') || name.includes('joint') || name.includes('motor') || name.includes('base')) {
        assignedMat = materials.graphite;
      }

      node.material = assignedMat;
      node.userData.originalMaterial = assignedMat;

      // Calculate bounding center
      node.geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      node.geometry.boundingBox.getCenter(center);

      // Determine mechanical explode axis & stage
      let explodeDir = new THREE.Vector3(0, 0, 0);
      let stageRank = 1;

      if (name.startsWith('neck') || name.includes('head')) {
        explodeDir.set(0, 0.45, 0.1);
        stageRank = 3;
      } else if (name.startsWith('l_shoulder') || name.startsWith('l_elbow') || name.startsWith('l_wrist')) {
        explodeDir.set(0, 0.1, -0.35);
        stageRank = 2;
      } else if (name.startsWith('r_shoulder') || name.startsWith('r_elbow') || name.startsWith('r_wrist')) {
        explodeDir.set(0, 0.1, 0.35);
        stageRank = 2;
      } else if (name.startsWith('torso')) {
        explodeDir.set(0.25, 0.1, 0);
        stageRank = 1;
      } else if (name.includes('knee') || name.includes('ankle') || name.includes('foot')) {
        explodeDir.set(0, -0.25, name.startsWith('l_') ? -0.15 : 0.15);
        stageRank = 2;
      }

      robotParts.push({
        mesh: node,
        name: node.name,
        homePos: node.position.clone(),
        currentOffset: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        targetOffset: new THREE.Vector3(0, 0, 0),
        explodeDir: explodeDir,
        stage: stageRank,
        center: center
      });
    }
  });
}

/* ==========================================================================
   DIRECTOR MODE SYSTEM & TRANSITIONS
   ========================================================================== */
function buildModeTabs() {
  modeTabs.innerHTML = '';
  DIRECTOR_ACTS.forEach((act, idx) => {
    const btn = document.createElement('button');
    btn.className = `mode-tab ${idx === 0 ? 'active' : ''}`;
    btn.dataset.index = idx;
    btn.innerHTML = `<span class="mode-tab-idx">0${idx + 1}</span><span>${act.name.split('// ')[1] || act.name}</span>`;
    btn.addEventListener('click', () => {
      applyAct(idx);
      audio.playClick();
    });
    modeTabs.appendChild(btn);
  });
}

function applyAct(idx) {
  state.actIndex = idx;
  state.act = DIRECTOR_ACTS[idx];

  // Update tabs active class
  document.querySelectorAll('.mode-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
  });

  // Laser scan line toggle
  if (state.act.laser) {
    laserOverlay.classList.add('active');
    audio.playLaserScan();
  } else {
    laserOverlay.classList.remove('active');
  }

  // Volumetric headline visibility
  if (state.act.showType) {
    volumetricType.classList.remove('hidden');
  } else {
    volumetricType.classList.add('hidden');
  }

  // Smooth Camera transition using GSAP or damped spring
  const targetCam = state.act.camera;
  if (window.gsap) {
    window.gsap.to(state, {
      radius: targetCam.radius,
      phi: targetCam.phi,
      theta: targetCam.theta,
      lookY: targetCam.lookY,
      fov: targetCam.fov,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
        zoomSlider.value = Math.round(state.fov);
      }
    });
  } else {
    state.radius = targetCam.radius;
    state.phi = targetCam.phi;
    state.theta = targetCam.theta;
    state.lookY = targetCam.lookY;
    state.fov = targetCam.fov;
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }

  // Teardown / Explode targets
  const isExplodedMode = state.act.id === 'exploded';
  explodeSlider.value = isExplodedMode ? 100 : 0;
  updateExplodeTargets(isExplodedMode ? 1.0 : 0);

  // Render Callout Cards
  renderCallouts(state.act.callouts);
}

function updateExplodeTargets(factor) {
  robotParts.forEach((part) => {
    part.targetOffset.copy(part.explodeDir).multiplyScalar(factor);
  });
}

function renderCallouts(calloutList) {
  calloutsContainer.innerHTML = '';
  if (!calloutList || calloutList.length === 0) return;

  const isMobile = window.innerWidth <= 768;
  const list = isMobile ? [calloutList[0]] : calloutList;

  list.forEach((item, i) => {
    const card = document.createElement('aside');
    card.className = 'callout-card';
    card.id = `callout_${i}`;
    card.dataset.part = item.part;
    card.dataset.ox = item.ox;
    card.dataset.oy = item.oy;
    card.dataset.oz = item.oz;
    
    // Position columns (left / right) on desktop
    if (!isMobile) {
      if (i % 2 === 0) {
        card.style.left = '48px';
        card.style.top = `${180 + i * 110}px`;
      } else {
        card.style.right = '48px';
        card.style.top = `${220 + (i - 1) * 110}px`;
      }
    }

    card.innerHTML = `
      <p class="callout-tag">SYS // KINEMATICS</p>
      <h3 class="callout-title">${item.title}</h3>
      <p class="callout-metric">${item.metric}</p>
      <p class="callout-desc">${item.desc}</p>
    `;

    calloutsContainer.appendChild(card);
    setTimeout(() => card.classList.add('visible'), 250 + i * 120);
  });
}

/* ==========================================================================
   SPRING PHYSICS SIMULATION (HYALOS STYLE)
   ========================================================================== */
const SPRING_K = 165;  // Stiffness
const SPRING_D = 24;   // Damping

function updateSprings(dt) {
  const stepSize = 1 / 120;
  let remaining = Math.min(dt, 0.1);

  while (remaining > 0) {
    const s = Math.min(stepSize, remaining);
    remaining -= s;

    for (let i = 0; i < robotParts.length; i++) {
      const p = robotParts[i];
      // F = -k*(x - target) - d*v
      const force = p.targetOffset.clone().sub(p.currentOffset).multiplyScalar(SPRING_K)
                     .sub(p.velocity.clone().multiplyScalar(SPRING_D));
      
      p.velocity.addScaledVector(force, s);
      p.currentOffset.addScaledVector(p.velocity, s);
      p.mesh.position.copy(p.homePos).add(p.currentOffset);
    }
  }
}

/* ==========================================================================
   DYNAMIC SVG LEADER LINES
   ========================================================================== */
function updateLeaderLines() {
  while (leadersSvg.firstChild) {
    leadersSvg.removeChild(leadersSvg.firstChild);
  }

  const cards = document.querySelectorAll('.callout-card.visible');
  if (cards.length === 0) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  cards.forEach((card) => {
    const partName = card.dataset.part;
    const part = robotParts.find((p) => p.name.startsWith(partName));
    if (!part) return;

    // Get 3D anchor in world space
    const anchor = part.mesh.position.clone();
    anchor.x += Number(card.dataset.ox || 0);
    anchor.y += Number(card.dataset.oy || 0);
    anchor.z += Number(card.dataset.oz || 0);

    // Project to screen space
    anchor.project(camera);

    // Behind camera check
    if (anchor.z > 1) return;

    const screenX = (anchor.x * 0.5 + 0.5) * width;
    const screenY = (-anchor.y * 0.5 + 0.5) * height;

    const cardRect = card.getBoundingClientRect();
    const isLeft = cardRect.left < width / 2;
    const cardEdgeX = isLeft ? cardRect.right : cardRect.left;
    const cardEdgeY = cardRect.top + cardRect.height / 2;

    // SVG Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', screenX);
    line.setAttribute('y1', screenY);
    line.setAttribute('x2', cardEdgeX);
    line.setAttribute('y2', cardEdgeY);
    line.setAttribute('class', 'leader-line');
    leadersSvg.appendChild(line);

    // Anchor Target Dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', screenX);
    dot.setAttribute('cy', screenY);
    dot.setAttribute('r', '3');
    dot.setAttribute('class', 'leader-dot');
    leadersSvg.appendChild(dot);

    // Pulsing Outer Ring
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', screenX);
    ring.setAttribute('cy', screenY);
    ring.setAttribute('r', '7');
    ring.setAttribute('class', 'leader-ring');
    leadersSvg.appendChild(ring);
  });
}

/* ==========================================================================
   USER CONTROLS & INTERACTIONS
   ========================================================================== */
function setupInteractions() {
  // Zoom Scrubber
  zoomSlider.addEventListener('input', (e) => {
    state.fov = Number(e.target.value);
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  });

  // Explode Scrubber
  explodeSlider.addEventListener('input', (e) => {
    state.manualExplode = Number(e.target.value) / 100;
    updateExplodeTargets(state.manualExplode);
  });

  // LiDAR Matrix Toggle
  btnLidar.addEventListener('click', () => {
    state.isLiDARMode = !state.isLiDARMode;
    btnLidar.classList.toggle('active', state.isLiDARMode);
    lidarRingMesh.visible = state.isLiDARMode;
    audio.playClick();

    robotParts.forEach((p) => {
      p.mesh.material = state.isLiDARMode ? materials.wireframe : p.mesh.userData.originalMaterial;
    });
  });

  // Audio Toggle
  btnAudio.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    btnAudio.textContent = isMuted ? 'AUDIO: OFF' : 'AUDIO: ON';
    btnAudio.classList.toggle('active', !isMuted);
    if (!isMuted) audio.playClick();
  });

  // Reset Camera View
  btnReset.addEventListener('click', () => {
    state.dragTheta = 0;
    state.dragPhi = 0;
    state.velTheta = 0;
    state.velPhi = 0;
    applyAct(state.actIndex);
    audio.playClick();
  });

  // Pointer / Touch Orbit
  let prevX = 0, prevY = 0;
  stage.addEventListener('pointerdown', (e) => {
    state.isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    state.velTheta = 0;
    state.velPhi = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;

    state.dragTheta -= dx * 0.005;
    state.dragPhi = THREE.MathUtils.clamp(state.dragPhi - dy * 0.004, -0.4, 0.4);
  });

  window.addEventListener('pointerup', () => {
    state.isDragging = false;
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

/* ==========================================================================
   RENDER LOOP (60 FPS FIXED KINEMATICS)
   ========================================================================== */
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - prevTime) * 0.001;
  prevTime = now;

  // Orbit camera position calculation
  const currentTheta = state.theta + state.dragTheta;
  const currentPhi = THREE.MathUtils.clamp(state.phi + state.dragPhi, 0.65, 1.48);

  const sinPhi = Math.sin(currentPhi);
  camera.position.x = state.radius * sinPhi * Math.sin(currentTheta);
  camera.position.y = state.lookY + state.radius * Math.cos(currentPhi);
  camera.position.z = state.radius * sinPhi * Math.cos(currentTheta);
  camera.lookAt(0, state.lookY, 0);

  // Update HUD telemetry coordinates
  hudCoords.textContent = `X: ${camera.position.x.toFixed(2)} · Y: ${camera.position.y.toFixed(2)} · Z: ${camera.position.z.toFixed(2)}`;

  // LiDAR floor rings animation
  if (lidarRingMesh.visible) {
    lidarRingMesh.rotation.z += dt * 0.4;
  }

  // Update Spring-physics offsets
  updateSprings(dt);

  // Project Leader Lines
  updateLeaderLines();

  // Render Postprocessing pass
  composer.render();
}

// Start Three.js
initThree();
animate();

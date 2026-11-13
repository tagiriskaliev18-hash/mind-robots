// Всё, что меняется от продукта к продукту, живёт только здесь.
export const PRODUCT = {
  name: "{{PRODUCT_NAME}}",
  glb: "",                           // {{GLB_PATH}}, напр. "assets/model.glb"; "" => процедурный плейсхолдер
  hdri: "assets/hdri/studio_small_09_1k.hdr",
  titleLines: ["{{HEADLINE_LINE_1}}", "{{HEADLINE_WORD}}", "{{HEADLINE_LINE_3}}"],
  titleFont: "Geist",
  height: 1.7                        // {{REAL_HEIGHT_M}}: модель нормализуется к реальному росту, пол = y 0
};

export const PALETTE = {
  bg: 0x09090f, violet: 0x7b2ff7, indigo: 0x4b3bff, blue: 0x1e90ff, cyan: 0x00f5ff,
  shell: 0xe6e3dc, joint: 0x2a2d33, ink: "#f4f2ee"
};

// Сферические координаты камеры вокруг look: radius (м), phi (полярный угол от +Y), theta (азимут).
export const HERO = { radius: 3.4, phi: 1.16, theta: 0.62, look: [0, 0.9, 0] };
export const INTRO = { radius: 6.4, phi: 1.02, theta: -0.55, look: [0, 1.25, 0], duration: 2.6 };

// group: имя группы деталей (см. PARTS_MAP); offset — куда уходит группа в этом табе (м, мировые оси).
export const TABS = [
  { id: "t1", label: "{{TAB_1}}", radius: 1.9,  phi: 1.16, theta: 1.35, look: [0.05, 1.82, 0],
    explode: { head: [0, 0.28, 0] },
    calls: [{ part: "head", title: "{{T1_C1_TITLE}}", fig: "{{T1_C1_FIG}}", unit: "", note: "{{T1_C1_NOTE}}", at: [0.09, 0.04, 0] }] },
  { id: "t2", label: "{{TAB_2}}", radius: 2.15, phi: 1.32, theta: 2.35, look: [0, 1.15, -0.2],
    explode: { armL: [0, 0, -0.16], armR: [0, 0, 0.16] },
    calls: [{ part: "armL", title: "{{T2_C1_TITLE}}", fig: "{{T2_C1_FIG}}", unit: "", note: "{{T2_C1_NOTE}}", at: [0, 0.02, -0.04] }] },
  { id: "t3", label: "{{TAB_3}}", radius: 2.55, phi: 1.28, theta: 0.48, look: [0, 1.2, 0],
    explode: { torso: [0, 0.22, 0], base: [0, -0.16, 0], head: [0, 0.34, 0] },
    calls: [{ part: "torso", title: "{{T3_C1_TITLE}}", fig: "{{T3_C1_FIG}}", unit: "{{T3_C1_UNIT}}", note: "{{T3_C1_NOTE}}", at: [0.12, 0.1, 0] }] },
  { id: "tear", label: "Разбор", radius: 4.6, phi: 1.18, theta: 0.62, look: [0, 1.15, 0], fit: true,
    explode: { head: [0, 0.46, 0], torso: [0, 0.12, 0], armL: [0, 0.02, -0.4], armR: [0, 0.02, 0.4], legL: [0, 0, -0.2], legR: [0, 0, 0.2] },
    calls: [
      { part: "head", title: "{{TEAR_C1_TITLE}}", fig: "{{TEAR_C1_FIG}}", unit: "", note: "{{TEAR_C1_NOTE}}", at: [0.08, 0.04, 0] },
      { part: "armL", title: "{{TEAR_C2_TITLE}}", fig: "{{TEAR_C2_FIG}}", unit: "", note: "{{TEAR_C2_NOTE}}", at: [0, 0.04, -0.05] },
      { part: "legL", title: "{{TEAR_C3_TITLE}}", fig: "{{TEAR_C3_FIG}}", unit: "", note: "{{TEAR_C3_NOTE}}", at: [0.02, 0.05, -0.04], desk: true }
    ] },
  { id: "build", label: "Сборка", radius: 3.82, phi: 1.2, theta: 0.68, look: [0, 0.96, 0],
    explode: {},
    calls: [{ part: "torso", title: "{{BUILD_C1_TITLE}}", fig: "{{BUILD_C1_FIG}}", unit: "{{BUILD_C1_UNIT}}", note: "{{BUILD_C1_NOTE}}", at: [0.06, 0, 0.02] }] }
];

// Регулярки по именам мешей GLB -> группа. Порядок важен: первое совпадение побеждает.
export const PARTS_MAP = [
  [/^(neck|head)/i, "head"],
  [/^l_(shoulder|elbow|wrist|hand)/i, "armL"],
  [/^r_(shoulder|elbow|wrist|hand)/i, "armR"],
  [/^l_(hip|knee|ankle|foot)/i, "legL"],
  [/^r_(hip|knee|ankle|foot)/i, "legR"],
  [/^(base|pelvis)/i, "base"],
  [/.*/, "torso"]
];
// Задержка старта пружины по группе (с) — волна разборки сверху вниз.
// На телефоне разлёт по X/Z ×0.5, по Y ×1.15: узкий кадр => разбор «вверх», а не «в стороны».
export const PHONE_EXPLODE = { lateral: 0.5, vertical: 1.15 };
export const STAGGER = { head: 0, armL: 0.08, armR: 0.08, torso: 0.15, base: 0.15, legL: 0.22, legR: 0.22 };

export const MOTION = {
  spring: { k: 70, c: 9.6 },        // ζ = c / (2√k) ≈ 0.57: лёгкий перелёт, механика, не желе
  camLambda: 4.6,                   // экспоненциальное сглаживание камеры, 1/с
  labelLambda: 7,
  labelShowError: 0.08,             // подписи появляются, когда система почти успокоилась
  labelShowAfter: 0.95,             // ...или через 0.95 с, что раньше
  drift: { orbit: 0.1, bobAmp: 0.04, bobHz: 0.18, breatheAmp: 0.07, breatheHz: 0.11 },
  inertia: 3.4,                     // затухание инерции drag, 1/с
  phiClamp: [0.72, 1.46], radiusClamp: [1.05, 8.2], pinchClamp: [0.55, 1.8]
};

export const QUALITY = {
  dprDesktop: 1.5, dprPhone: 2, dprLow: 1.35, dprMin: 1,
  budgetMs: 22, sampleFrames: 45, downStep: 0.7,
  fov: 32, near: 0.08, far: 40, fog: 0.048,
  bloom: { luminanceThreshold: 3.4, luminanceSmoothing: 0.25, intensity: 1.35, radius: 0.42, levels: 5 },
  ledEmissive: 8,
  ao: { radiusDesk: 22, radiusPhone: 16, intensity: 5, distanceFalloff: 0.22 },
  envIntensity: 0.32, envRotationY: 2.2
};

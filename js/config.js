// Всё, что меняется от продукта к продукту, живёт только здесь.
export const PRODUCT = {
  name: "Unitree G1",
  glb: "assets/model.glb",
  hdri: "assets/hdri/studio_small_09_1k.hdr",
  titleLines: ["Unitree G1", "Кинематика", "43 степени"],
  titleFont: "Geist",
  titleScale: 0.98,
  titleDepth: -0.44,
  height: 1.32 // Реальный габарит Unitree G1 в стойке (1320 мм), пол = y 0
};

export const PALETTE = {
  bg: 0x09090f,
  violet: 0x7b2ff7,
  indigo: 0x4b3bff,
  blue: 0x1e90ff,
  cyan: 0x00f5ff,
  shell: 0xe6e3dc,
  joint: 0x2a2d33,
  ink: "#f4f2ee"
};

// Сферические координаты камеры вокруг look: radius (м), phi (полярный угол от +Y), theta (азимут).
export const HERO = { radius: 2.74, phi: 1.16, theta: 0.68, look: [0, 0.68, 0], phoneRadius: 1.18, phoneLift: 0.08 };
export const INTRO = { radius: 5.1, phi: 1.02, theta: -0.52, look: [0, 0.96, 0], duration: 2.6 };

// group: имя группы деталей (см. PARTS_MAP); offset — базовый вектор разлёта группы (м, мировые оси), каскадируется по цепи в explode.js.
export const TABS = [
  {
    id: "head",
    label: "Голова",
    radius: 1.66,
    phi: 1.15,
    theta: 1.18,
    look: [0.02, 1.19, 0],
    phoneRadius: 1.28,
    phoneLift: 0.23,
    explode: { head: [0, 0.22, 0], logo: [0.09, 0.02, 0] },
    calls: [
      { part: "head_link", title: "Лидар", fig: "360°", unit: "", note: "Твердотельный 3D-лидар Livox Mid-360 в куполе головы.", at: [0.03, 0.08, 0.05] },
      { part: "head_link", title: "Глубина", fig: "D435i", unit: "", note: "Стереокамера Intel RealSense для ближней зоны захвата.", at: [0.07, -0.02, -0.05] },
      { part: "logo_link", title: "Контур", fig: "IMU ×2", unit: "", note: "Два инерциальных блока: в торсе и в тазовом узле.", at: [0.07, 0.0, -0.04], desk: true }
    ]
  },
  {
    id: "arms",
    label: "Руки",
    radius: 2.26,
    phi: 1.24,
    theta: 1.68,
    look: [0.0, 0.85, 0.0],
    phoneRadius: 1.75,
    phoneLift: 0.13,
    explode: { armL: [0.04, -0.03, -0.22], armR: [0.04, -0.03, 0.22] },
    calls: [
      { part: "right_hand_dex3", title: "Кисть", fig: "Dex3-1", unit: "", note: "Трёхпалый схват с силомоментным и тактильным контуром.", at: [0.03, 0.02, 0.04] },
      { part: "left_hand_dex3", title: "Степени", fig: "7", unit: "DOF", note: "На каждую кисть: 3 оси в большом пальце и по 2 в остальных.", at: [0.03, 0.02, -0.04] },
      { part: "left_wrist_yaw_link", title: "Запястье", fig: "3 оси", unit: "", note: "Roll, pitch и yaw собирают предплечье в точный подвес.", at: [0.02, 0.02, -0.03], desk: true }
    ]
  },
  {
    id: "torso",
    label: "Корпус",
    radius: 3.12,
    phi: 1.22,
    theta: 1.16,
    look: [0, 0.78, 0],
    phoneRadius: 1.35,
    phoneLift: 0.17,
    explode: { head: [0, 0.16, 0], logo: [0.1, 0.08, 0], torso: [0, 0.07, 0], waist: [0, -0.01, 0], base: [0, -0.12, 0] },
    calls: [
      { part: "torso_link", title: "Масса", fig: "35", unit: "кг", note: "Снаряжённый вес робота вместе с аккумуляторным блоком.", at: [0.05, 0.06, 0.08] },
      { part: "torso_link", title: "Батарея", fig: "2", unit: "ч", note: "Быстросъёмный блок 9000 мА·ч (13S Li-ion) в спине.", at: [-0.04, 0.02, -0.08] },
      { part: "waist_yaw_link", title: "Талия", fig: "3 оси", unit: "", note: "Yaw, roll и pitch развязывают корпус и шаг.", at: [0.04, 0.0, 0.04], desk: true }
    ]
  },
  {
    id: "drive",
    label: "Привод",
    radius: 2.88,
    phi: 1.24,
    theta: 1.56,
    look: [0, 0.68, 0],
    phoneRadius: 1.43,
    phoneLift: 0.16,
    explode: { base: [0, 0.06, 0], legL: [0.02, -0.04, -0.16], legR: [0.02, -0.04, 0.16] },
    calls: [
      { part: "right_knee_link", title: "Колено", fig: "120", unit: "Н·м", note: "Пиковый крутящий момент коленного привода версии EDU.", at: [0.04, 0.11, 0.03] },
      { part: "left_hip_yaw_link", title: "Свобода", fig: "43", unit: "DOF", note: "Полная конфигурация суставов G1 EDU с кистями Dex3-1.", at: [0.04, 0.02, -0.04] },
      { part: "left_ankle_roll_link", title: "Привод", fig: "PMSM", unit: "", note: "Синхронные электромоторы с полым валом без гидравлики.", at: [0.06, 0.02, -0.03], desk: true }
    ]
  },
  {
    id: "tear",
    label: "Разбор",
    radius: 3.6,
    phi: 1.18,
    theta: 1.04,
    look: [0, 0.72, 0],
    fit: true,
    explode: {
      head: [0, 0.36, 0],
      logo: [0.12, 0.16, 0],
      torso: [0, 0.14, 0],
      waist: [0, 0.02, 0],
      base: [0, -0.08, 0],
      armL: [0.03, 0.02, -0.28],
      armR: [0.03, 0.02, 0.28],
      legL: [0, -0.04, -0.15],
      legR: [0, -0.04, 0.15]
    },
    calls: [
      { part: "head_link", title: "Голова", fig: "LiDAR", unit: "", note: "Купол Mid-360 и камера глубины выходят вверх по оси.", at: [0.04, 0.04, 0.05] },
      { part: "left_hand_dex3", title: "Руки", fig: "2×7", unit: "DOF", note: "Плечо, локоть, запястье и схват расходятся каскадом.", at: [0.02, 0.02, -0.04] },
      { part: "right_knee_link", title: "Опора", fig: "2×6", unit: "DOF", note: "Бедро, колено и стопа собраны в силовую колонну.", at: [0.04, 0.06, 0.03], desk: true }
    ]
  },
  {
    id: "build",
    label: "Сборка",
    radius: 2.96,
    phi: 1.2,
    theta: 0.74,
    look: [0, 0.69, 0],
    phoneRadius: 1.36,
    phoneLift: 0.15,
    explode: {},
    calls: [
      { part: "head_link", title: "Рост", fig: "1,32", unit: "м", note: "Габарит в стойке; складывается в 690×450×300 мм.", at: [0.05, 0.04, 0.05] },
      { part: "left_knee_link", title: "Скорость", fig: "2,0", unit: "м/с", note: "Динамический бег и удержание баланса при толчке.", at: [0.04, 0.1, -0.03] },
      { part: "pelvis_contour_link", title: "Модель", fig: "MJX", unit: "", note: "Открытая MJCF-схема переносится из симуляции в железо.", at: [0.05, 0.0, 0.05], desk: true }
    ]
  }
];

// Регулярки по именам мешей GLB -> группа. Порядок важен: первое совпадение побеждает.
export const PARTS_MAP = [
  [/^(neck|head)/i, "head"],
  [/^logo/i, "logo"],
  [/^waist/i, "waist"],
  [/^(l_|left_)(shoulder|elbow|wrist|hand)/i, "armL"],
  [/^(r_|right_)(shoulder|elbow|wrist|hand)/i, "armR"],
  [/^(l_|left_)(hip|knee|ankle|foot)/i, "legL"],
  [/^(r_|right_)(hip|knee|ankle|foot)/i, "legR"],
  [/^(base|pelvis)/i, "base"],
  [/.*/, "torso"]
];

// На телефоне разлёт по X/Z ×0.5, по Y ×1.15: узкий кадр => разбор «вверх», а не «в стороны».
export const PHONE_EXPLODE = { lateral: 0.5, vertical: 1.15 };
export const STAGGER = { head: 0, logo: 0.04, armL: 0.08, armR: 0.08, torso: 0.14, waist: 0.15, base: 0.16, legL: 0.22, legR: 0.22 };

export const MOTION = {
  spring: { k: 70, c: 9.6 }, // ζ = c / (2√k) ≈ 0.57: лёгкий механический перелёт
  camLambda: 4.6,
  labelLambda: 7,
  labelShowError: 0.08,
  labelShowAfter: 0.95,
  drift: { orbit: 0.1, bobAmp: 0.04, bobHz: 0.18, breatheAmp: 0.07, breatheHz: 0.11 },
  inertia: 3.4,
  phiClamp: [0.72, 1.46],
  radiusClamp: [1.05, 8.2],
  pinchClamp: [0.55, 1.8]
};

export const QUALITY = {
  dprDesktop: 1.5,
  dprPhone: 2,
  dprLow: 1.35,
  dprMin: 1,
  budgetMs: 22,
  sampleFrames: 45,
  downStep: 0.7,
  fov: 32,
  near: 0.08,
  far: 40,
  fog: 0.048,
  bloom: { luminanceThreshold: 3.4, luminanceSmoothing: 0.25, intensity: 1.35, radius: 0.42, levels: 5 },
  ledEmissive: 8,
  ao: { radiusDesk: 22, radiusPhone: 16, intensity: 5, distanceFalloff: 0.22 },
  envIntensity: 0.32,
  envRotationY: 2.2
};

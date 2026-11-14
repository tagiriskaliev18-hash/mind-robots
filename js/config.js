// Всё, что меняется от продукта к продукту, живёт только здесь (Apptronik Apollo, 1.73 м).
export const PRODUCT = {
  name: "Apptronik Apollo",
  glb: "assets/model.glb",
  hdri: "assets/hdri/studio_small_09_1k.hdr",
  titleLines: ["Apptronik Apollo", "Биомеханика", "4 ч · 25 кг"],
  titleFont: "Geist",
  titleScale: 1.16,
  titleDepth: -0.52,
  height: 1.73 // Реальный габарит Apptronik Apollo в стойке (1730 мм / 5'8"), пол = y 0
};

export const PALETTE = {
  bg: 0x09090f,
  violet: 0x7b2ff7,
  indigo: 0x4b3bff,
  blue: 0x1e90ff,
  cyan: 0x00f5ff,
  shell: 0xeaecf0,
  joint: 0x151820,
  glass: 0x05070c,
  ink: "#f4f2ee"
};

// Сферические координаты камеры вокруг look: radius (м), phi (полярный угол от +Y), theta (азимут).
export const HERO = { radius: 3.56, phi: 1.15, theta: 0.68, look: [0, 0.89, 0], phoneRadius: 1.24, phoneLift: 0.08 };
export const INTRO = { radius: 6.4, phi: 1.02, theta: -0.52, look: [0, 1.20, 0], duration: 2.3 };

// group: имя группы деталей (см. PARTS_MAP); offset — базовый вектор разлёта группы (м, мировые оси), каскадируется по цепи в explode.js.
export const TABS = [
  {
    id: "head",
    label: "Голова",
    radius: 1.90,
    phi: 1.18,
    theta: 1.32,
    look: [0.02, 1.56, 0],
    phoneRadius: 1.28,
    phoneLift: 0.20,
    explode: { head: [0, 0.22, 0], logo: [0.10, 0.02, 0] },
    calls: [
      { part: "head_visor_glass", title: "Оптика", fig: "Stereo", unit: "", note: "Две тёмные стереолинзы в светлой овальной панели и LED-индикатор речи.", at: [0.06, -0.02, 0.03] },
      { part: "head_link", title: "Шлем", fig: "1,64 м", unit: "", note: "Матовый обтекатель с боковыми перфорированными акустическими вставками.", at: [0.04, 0.03, -0.05] },
      { part: "logo_link", title: "Дисплей", fig: "OLED", unit: "", note: "Нагрудный экран статуса NET / BAT / SYS с камерой обзора и четырьмя сенсорами.", at: [0.04, 0.0, 0.04], desk: true }
    ]
  },
  {
    id: "arms",
    label: "Руки",
    radius: 2.75,
    phi: 1.24,
    theta: 1.66,
    look: [0.0, 1.10, 0.0],
    phoneRadius: 1.78,
    phoneLift: 0.13,
    explode: { armL: [0.04, -0.02, -0.26], armR: [0.04, -0.02, 0.26] },
    calls: [
      { part: "right_hand_dex3", title: "Хват", fig: "25", unit: "кг", note: "Полезная нагрузка на две руки (55 фунтов) при малом весе звеньев.", at: [0.03, 0.03, 0.04] },
      { part: "left_hand_dex3", title: "Кисть", fig: "5", unit: "пальц.", note: "Антропоморфная кисть с противопоставленным большим пальцем.", at: [0.03, 0.02, -0.04] },
      { part: "left_wrist_yaw_link", title: "Привод", fig: "Linear", unit: "", note: "Линейные электроприводы предплечья с силовым контролем.", at: [0.02, 0.03, -0.03], desk: true }
    ]
  },
  {
    id: "torso",
    label: "Корпус",
    radius: 3.72,
    phi: 1.22,
    theta: 1.15,
    look: [0, 1.06, 0],
    phoneRadius: 1.38,
    phoneLift: 0.16,
    explode: { head: [0, 0.20, 0], logo: [0.12, 0.09, 0], torso: [0, 0.09, 0], waist: [0, -0.01, 0], base: [0, -0.14, 0] },
    calls: [
      { part: "torso_link", title: "Масса", fig: "73", unit: "кг", note: "Рабочий вес 160 lb в габарите человека для общих цехов.", at: [0.07, 0.08, 0.09] },
      { part: "battery_pack_link", title: "Батарея", fig: "4", unit: "ч", note: "Быстросъёмный блок в спине: горячая замена без простоя смены.", at: [-0.04, 0.02, -0.08] },
      { part: "waist_yaw_link", title: "Модуль", fig: "Split", unit: "", note: "Разъёмная талия переносит торс на стационар или платформу AMR.", at: [0.05, 0.0, 0.05], desk: true }
    ]
  },
  {
    id: "drive",
    label: "Привод",
    radius: 3.48,
    phi: 1.24,
    theta: 1.54,
    look: [0, 0.84, 0],
    phoneRadius: 1.46,
    phoneLift: 0.15,
    explode: { base: [0, 0.07, 0], legL: [0.02, -0.05, -0.19], legR: [0.02, -0.05, 0.19] },
    calls: [
      { part: "right_knee_actuator_link", title: "Архитектура", fig: "NASA", unit: "Valkyrie", note: "Собственные линейные электроприводы вместо сложных редукторов.", at: [0.03, 0.09, 0.04] },
      { part: "left_hip_yaw_link", title: "Свобода", fig: "36", unit: "DOF", note: "Оси шеи, рук, 5-палых кистей, торса и шагающей опоры.", at: [0.04, 0.02, -0.04] },
      { part: "left_ankle_roll_link", title: "База", fig: "Bi / AMR", unit: "", note: "Бипедальные ноги или колёсная тележка с общей проводкой.", at: [0.06, 0.02, -0.03], desk: true }
    ]
  },
  {
    id: "tear",
    label: "Разбор",
    radius: 4.35,
    phi: 1.18,
    theta: 1.04,
    look: [0, 0.92, 0],
    fit: true,
    explode: {
      head: [0, 0.42, 0],
      logo: [0.15, 0.19, 0],
      torso: [0, 0.16, 0],
      waist: [0, 0.02, 0],
      base: [0, -0.10, 0],
      armL: [0.04, 0.03, -0.34],
      armR: [0.04, 0.03, 0.34],
      legL: [0, -0.05, -0.18],
      legR: [0, -0.05, 0.18]
    },
    calls: [
      { part: "head_link", title: "Голова", fig: "E-Ink", unit: "", note: "Перламутровый обтекатель, тёмный визор и стереозрение.", at: [0.05, 0.04, 0.05] },
      { part: "left_hand_dex3", title: "Руки", fig: "25", unit: "кг", note: "Плечевой сустав, толкатель и пятипалая кисть в сборе.", at: [0.03, 0.03, -0.05] },
      { part: "right_knee_link", title: "Опора", fig: "1,73", unit: "м", note: "Парные линейные толкатели бедра и голени.", at: [0.05, 0.06, 0.04], desk: true }
    ]
  },
  {
    id: "build",
    label: "Сборка",
    radius: 3.68,
    phi: 1.2,
    theta: 0.74,
    look: [0, 0.89, 0],
    phoneRadius: 1.36,
    phoneLift: 0.15,
    explode: {},
    calls: [
      { part: "head_link", title: "Рост", fig: "1,73", unit: "м", note: "Человеческий масштаб 5'8\" для работы в стандартных проходах.", at: [0.05, 0.04, 0.05] },
      { part: "left_knee_link", title: "Нагрузка", fig: "25", unit: "кг", note: "Подъём паллет и деталей 55 lb с плавным силовым контролем.", at: [0.04, 0.10, -0.04] },
      { part: "pelvis_contour_link", title: "Цикл", fig: "4", unit: "ч", note: "Сменные батареи 24/7 без ожидания на зарядной станции.", at: [0.06, 0.0, 0.05], desk: true }
    ]
  }
];

// Регулярки по именам мешей GLB -> группа. Порядок важен: первое совпадение побеждает.
export const PARTS_MAP = [
  [/^(neck|head|visor)/i, "head"],
  [/^(logo|chest_oled)/i, "logo"],
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
  radiusClamp: [1.05, 8.6],
  pinchClamp: [0.55, 1.8]
};

export const QUALITY = {
  dprDesktop: 1.5,
  dprPhone: 1.15,
  dprLow: 0.85,
  dprMin: 0.72,
  budgetMs: 20,
  sampleFrames: 30,
  downStep: 0.75,
  fov: 32,
  near: 0.08,
  far: 40,
  fog: 0.044,
  bloom: { luminanceThreshold: 3.4, luminanceSmoothing: 0.25, intensity: 1.35, radius: 0.42, levels: 3 },
  ledEmissive: 7.5,
  ao: { radiusDesk: 22, radiusPhone: 16, intensity: 5, distanceFalloff: 0.22 },
  envIntensity: 0.34,
  envRotationY: 2.2
};

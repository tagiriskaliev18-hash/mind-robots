import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PALETTE, PARTS_MAP, STAGGER, QUALITY, PRODUCT } from "./config.js";
import { chainFactor } from "./explode.js";

const groupOf = (name) => (PARTS_MAP.find(([re]) => re.test(name)) || [null, "torso"])[1];

export function makeMaterials() {
  const shell = new THREE.MeshStandardMaterial({
    color: PALETTE.shell,
    roughness: 0.46,
    metalness: 0.04,
    envMapIntensity: 0.24
  });
  const faceplate = new THREE.MeshStandardMaterial({
    color: 0xe3e6ec,
    roughness: 0.44,
    metalness: 0.04,
    envMapIntensity: 0.22
  });
  const joint = new THREE.MeshStandardMaterial({
    color: PALETTE.joint,
    roughness: 0.46,
    metalness: 0.62,
    envMapIntensity: 0.44
  });
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.glass,
    roughness: 0.12,
    metalness: 0.34,
    envMapIntensity: 0.92
  });
  const estop = new THREE.MeshStandardMaterial({
    color: 0xa61618,
    roughness: 0.36,
    metalness: 0.12,
    envMapIntensity: 0.30
  });
  const greenLed = new THREE.MeshStandardMaterial({
    color: 0x0c3d20,
    emissive: 0x18e066,
    emissiveIntensity: 1.4,
    toneMapped: false,
    roughness: 0.24
  });
  // Яркие циан-акценты Apptronik Apollo × Mind (LED-индикатор речи, статус-глинт и локтевые узлы).
  const led = new THREE.MeshStandardMaterial({
    color: 0x00383c,
    emissive: PALETTE.cyan,
    emissiveIntensity: QUALITY.ledEmissive,
    toneMapped: false,
    roughness: 0.2
  });
  return { shell, faceplate, joint, glass, estop, greenLed, led };
}

// Каждая деталь — запись с пружинным состоянием. Меши НЕ перепаренчиваются: двигаем position относительно rest.
function registerPart(parts, obj) {
  obj.geometry.computeBoundingBox();
  const centerLocal = obj.geometry.boundingBox.getCenter(new THREE.Vector3());
  const group = groupOf(obj.name);
  parts.push({
    name: obj.name,
    mesh: obj,
    group,
    chain: chainFactor(obj.name),
    rest: obj.position.clone(),
    centerLocal,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    goal: new THREE.Vector3(),
    delay: STAGGER[group] ?? 0.15,
    age: 0
  });
}

// Загрузка или разбор предзагруженного ArrayBuffer GLB по микро-чанкам без статтеров Act I.
export async function loadModel(source, renderer, mats, onProgress, still = false) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  if (source instanceof ArrayBuffer) {
    onProgress?.(0.75);
    gltf = await loader.parseAsync(source, "");
    onProgress?.(1);
  } else {
    gltf = await loader.loadAsync(source, (e) => e.total && onProgress?.(e.loaded / e.total));
  }

  normalize(gltf.scene);
  // Flatten: запекаем мировую матрицу в геометрию, все меши — прямые дети плоского root с identity-трансформом.
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) meshes.push(o); });
  const root = new THREE.Group();
  const parts = [];
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  for (let i = 0; i < meshes.length; i++) {
    const obj = meshes[i];
    obj.geometry = toFloat(obj.geometry).applyMatrix4(obj.matrixWorld);
    obj.name = obj.name || obj.parent?.name || "part";
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.set(1, 1, 1);
    const matName = obj.material?.name || "";
    const srcMat = obj.material;
    if (srcMat?.map && !matName.startsWith("Palette")) {
      srcMat.map.colorSpace = THREE.SRGBColorSpace;
      srcMat.map.needsUpdate = true;
      const isCutout = srcMat.alphaMode === "MASK" || matName === "apollo_wordmark" || matName === "apollo_back_monogram";
      obj.material = new THREE.MeshStandardMaterial({
        map: srcMat.map,
        color: 0xffffff,
        roughness: isCutout ? 0.52 : 0.14,
        metalness: isCutout ? 0.02 : 0.18,
        envMapIntensity: isCutout ? 0.22 : 0.42,
        transparent: isCutout,
        alphaTest: isCutout ? 0.35 : 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
    } else if (matName === "apollo_faceplate") {
      obj.material = mats.faceplate;
    } else if (matName === "apollo_estop") {
      obj.material = mats.estop;
    } else if (matName === "apollo_green_led") {
      obj.material = mats.greenLed;
    } else {
      const isGlass = matName === "apollo_glass" || /visor|logo|oled/i.test(obj.name);
      const dark = !isGlass && srcMat?.color && srcMat.color.r < 0.4;
      obj.material = isGlass ? mats.glass : (dark ? mats.joint : mats.shell);
    }
    obj.castShadow = false;
    root.add(obj);
    registerPart(parts, obj);
    // Разбиваем распаковку буферов на микро-чанки, чтобы Act I не замирал во время подготовки Act II.
    if (!still && i % 5 === 4) await nextFrame();
  }
  return { root, parts };
}

function normScale(arr) {
  if (arr instanceof Int8Array) return 1 / 127;
  if (arr instanceof Uint8Array) return 1 / 255;
  if (arr instanceof Int16Array) return 1 / 32767;
  if (arr instanceof Uint16Array) return 1 / 65535;
  return 1;
}

// Быстрая распаковка Int16/Int8/interleaved атрибутов meshopt/quantization в Float32 без циклов getComponent().
function toFloat(src) {
  const geo = new THREE.BufferGeometry();
  for (const [key, attr] of Object.entries(src.attributes)) {
    const itemSize = attr.itemSize;
    const count = attr.count;
    let data;
    if (!attr.isInterleavedBufferAttribute && !attr.normalized && attr.array instanceof Float32Array) {
      data = new Float32Array(attr.array);
    } else if (!attr.isInterleavedBufferAttribute) {
      const raw = attr.array;
      const scale = attr.normalized ? normScale(raw) : 1;
      data = new Float32Array(count * itemSize);
      const n = count * itemSize;
      if (scale === 1) {
        data.set(raw);
      } else {
        for (let j = 0; j < n; j++) data[j] = raw[j] * scale;
      }
    } else {
      const raw = attr.data.array;
      const stride = attr.data.stride;
      const offset = attr.offset;
      const scale = attr.normalized ? normScale(raw) : 1;
      data = new Float32Array(count * itemSize);
      for (let i = 0; i < count; i++) {
        const srcBase = i * stride + offset;
        const dstBase = i * itemSize;
        for (let k = 0; k < itemSize; k++) data[dstBase + k] = raw[srcBase + k] * scale;
      }
    }
    geo.setAttribute(key, new THREE.BufferAttribute(data, itemSize));
  }
  if (src.index) geo.setIndex(src.index.clone());
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

// Реальный масштаб: высота = PRODUCT.height (1.73 м), центр по X/Z = 0, пол = y 0.
function normalize(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y;
  if (h > 0) root.scale.multiplyScalar(PRODUCT.height / h);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  root.updateMatrixWorld(true);
}

// Плейсхолдер: инженерная фигура Apptronik Apollo в масштабе 1.73 м на случай отсутствия GLB.
export function placeholderModel(mats) {
  const root = new THREE.Group();
  const parts = [];
  const add = (name, geo, pos, mat = mats.shell) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(...pos);
    root.add(m);
    registerPart(parts, m);
  };
  add("head_link", new THREE.CapsuleGeometry(0.10, 0.08, 8, 24), [0, 1.62, 0], mats.shell);
  add("head_visor_glass", new THREE.BoxGeometry(0.06, 0.11, 0.14), [0.075, 1.61, 0], mats.glass);
  add("logo_link", new THREE.BoxGeometry(0.04, 0.13, 0.19), [0.13, 1.32, 0], mats.glass);
  add("torso_link", new THREE.BoxGeometry(0.25, 0.40, 0.36, 4, 4, 4), [0, 1.26, 0], mats.shell);
  add("battery_pack_link", new THREE.BoxGeometry(0.07, 0.24, 0.20), [-0.13, 1.28, 0], mats.joint);
  add("waist_yaw_link", new THREE.CylinderGeometry(0.085, 0.09, 0.09, 24), [0, 1.03, 0], mats.joint);
  add("pelvis_contour_link", new THREE.BoxGeometry(0.20, 0.14, 0.24), [0, 0.92, 0], mats.shell);
  for (const [s, side] of [["left", -1], ["right", 1]]) {
    add(s + "_shoulder_roll_link", new THREE.SphereGeometry(0.056, 20, 14), [0, 1.40, side * 0.23], mats.joint);
    add(s + "_elbow_link", new THREE.CapsuleGeometry(0.042, 0.22, 8, 16), [0, 1.12, side * 0.26], mats.joint);
    add(s + "_wrist_yaw_link", new THREE.CapsuleGeometry(0.038, 0.19, 8, 16), [0.01, 0.96, side * 0.26], mats.shell);
    add(s + "_hand_dex3", new THREE.BoxGeometry(0.06, 0.15, 0.07), [0.025, 0.76, side * 0.27], mats.shell);
    add(s + "_hip_yaw_link", new THREE.CapsuleGeometry(0.065, 0.28, 8, 16), [0, 0.70, side * 0.11], mats.shell);
    add(s + "_knee_link", new THREE.CapsuleGeometry(0.054, 0.28, 8, 16), [0, 0.31, side * 0.11], mats.shell);
    add(s + "_knee_actuator_link", new THREE.CylinderGeometry(0.016, 0.016, 0.28, 12), [-0.04, 0.30, side * 0.11], mats.joint);
    add(s + "_ankle_roll_link", new THREE.BoxGeometry(0.24, 0.05, 0.10), [0.04, 0.025, side * 0.11], mats.joint);
  }
  return { root, parts };
}

let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, "rgba(0, 245, 255, 0.85)");
  grd.addColorStop(0.35, "rgba(0, 245, 255, 0.35)");
  grd.addColorStop(1, "rgba(0, 245, 255, 0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

// Циан-лампы (с мягким аддитивным ореолом вместо дорогого полноэкранного Blur Composer) крепятся к детали.
export function addLamp(lamps, scene, part, local, geo, mat, rot = [0, 0, 0], haloScale = 0.10) {
  if (!part) return;
  const lamp = new THREE.Mesh(geo, mat);
  lamp.rotation.set(rot[0], rot[1], rot[2]);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  halo.scale.set(haloScale, haloScale, 1);
  lamp.add(halo);
  lamp.userData = { part, halo, local: new THREE.Vector3(...local) };
  lamps.push(lamp);
  scene.add(lamp);
}

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PALETTE, PARTS_MAP, STAGGER, QUALITY, PRODUCT } from "./config.js";

const groupOf = (name) => (PARTS_MAP.find(([re]) => re.test(name)) || [null, "torso"])[1];

export function makeMaterials() {
  const shell = new THREE.MeshPhysicalMaterial({ color: PALETTE.shell, roughness: 0.56, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.62, envMapIntensity: 0.12 });
  const joint = new THREE.MeshStandardMaterial({ color: PALETTE.joint, roughness: 0.58, metalness: 0.62, envMapIntensity: 0.42 });
  // Только эти меши ярче порога bloom: emissive 8 при toneMapped:false, порог 3.4.
  const led = new THREE.MeshStandardMaterial({ color: 0x00383c, emissive: PALETTE.cyan, emissiveIntensity: QUALITY.ledEmissive, toneMapped: false, roughness: 0.2 });
  return { shell, joint, led };
}

// Каждая деталь — запись с пружинным состоянием. Меши НЕ перепаренчиваются: двигаем position относительно rest.
function registerPart(parts, obj) {
  obj.geometry.computeBoundingBox();
  const centerLocal = obj.geometry.boundingBox.getCenter(new THREE.Vector3());
  const group = groupOf(obj.name);
  parts.push({
    name: obj.name, mesh: obj, group,
    rest: obj.position.clone(), centerLocal,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), goal: new THREE.Vector3(),
    delay: STAGGER[group] ?? 0.15, age: 0
  });
}

export async function loadModel(url, renderer, mats, onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/");
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total));

  normalize(gltf.scene);
  // Flatten: запекаем мировую матрицу в геометрию, все меши — прямые дети плоского root с identity-трансформом.
  // После этого mesh.position — это ровно «смещение разлёта» в метрах мира, а centerLocal — мировой центр детали.
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) meshes.push(o); });
  const root = new THREE.Group();
  const parts = [];
  for (const obj of meshes) {
    obj.geometry = toFloat(obj.geometry).applyMatrix4(obj.matrixWorld);
    obj.name = obj.name || obj.parent?.name || "part";
    obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.set(1, 1, 1);
    const dark = obj.material?.color && obj.material.color.r < 0.4;
    obj.material = dark ? mats.joint : mats.shell;
    obj.castShadow = true;
    root.add(obj);
    registerPart(parts, obj);
  }
  draco.dispose();
  return { root, parts };
}

// meshopt/KHR_mesh_quantization отдают Int16/Int8 normalized и interleaved атрибуты.
// Запекать матрицу в такие буферы нельзя (молча получится мусор/чёрные меши) => сначала в чистый Float32.
function toFloat(src) {
  const geo = new THREE.BufferGeometry();
  for (const [key, attr] of Object.entries(src.attributes)) {
    const data = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) data[i * attr.itemSize + k] = attr.getComponent(i, k);
    geo.setAttribute(key, new THREE.BufferAttribute(data, attr.itemSize));
  }
  if (src.index) geo.setIndex(Array.from(src.index.array));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

// Реальный масштаб: высота = PRODUCT.height (м), центр по X/Z = 0, пол = y 0. Тогда HERO/TABS-константы переносимы между ассетами.
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

// Плейсхолдер: честная «инженерная» фигура из скруглённых капсул и коробок, разделённая на те же группы.
export function placeholderModel(mats) {
  const root = new THREE.Group();
  const parts = [];
  const add = (name, geo, pos, dark) => {
    const m = new THREE.Mesh(geo, dark ? mats.joint : mats.shell);
    m.name = name; m.position.set(...pos); m.castShadow = true;
    root.add(m); registerPart(parts, m);
  };
  add("head", new THREE.CapsuleGeometry(0.11, 0.08, 8, 24), [0, 1.62, 0]);
  add("neck_joint", new THREE.CylinderGeometry(0.045, 0.05, 0.08, 24), [0, 1.47, 0], true);
  add("torso_shell", new THREE.BoxGeometry(0.36, 0.48, 0.22, 4, 4, 4), [0, 1.18, 0]);
  add("base_pelvis", new THREE.BoxGeometry(0.3, 0.14, 0.2), [0, 0.86, 0], true);
  for (const [s, side] of [["l", -1], ["r", 1]]) {
    add(s + "_shoulder", new THREE.SphereGeometry(0.07, 24, 16), [0, 1.36, side * 0.25], true);
    add(s + "_elbow_upper", new THREE.CapsuleGeometry(0.05, 0.22, 8, 16), [0, 1.16, side * 0.27]);
    add(s + "_wrist_fore", new THREE.CapsuleGeometry(0.045, 0.2, 8, 16), [0, 0.88, side * 0.28]);
    add(s + "_hip_thigh", new THREE.CapsuleGeometry(0.07, 0.3, 8, 16), [0, 0.62, side * 0.1]);
    add(s + "_knee_shin", new THREE.CapsuleGeometry(0.06, 0.3, 8, 16), [0, 0.26, side * 0.1]);
    add(s + "_foot", new THREE.BoxGeometry(0.22, 0.06, 0.1), [0.04, 0.03, side * 0.1], true);
  }
  return { root, parts };
}

// Циан-лампы (bloom) крепятся к детали и едут вместе с ней.
export function addLamp(lamps, scene, part, local, radius, mat) {
  if (!part) return;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0026, 8, 24), mat);
  ring.userData = { part, local: new THREE.Vector3(...local) };
  lamps.push(ring);
  scene.add(ring);
}

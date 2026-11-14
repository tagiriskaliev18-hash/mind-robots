import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PALETTE, PARTS_MAP, STAGGER, QUALITY, PRODUCT } from "./config.js";
import { chainFactor } from "./explode.js";

const groupOf = (name) => (PARTS_MAP.find(([re]) => re.test(name)) || [null, "torso"])[1];

export function makeMaterials() {
  const shell = new THREE.MeshPhysicalMaterial({
    color: PALETTE.shell,
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
    envMapIntensity: 0.12
  });
  const joint = new THREE.MeshStandardMaterial({
    color: PALETTE.joint,
    roughness: 0.58,
    metalness: 0.62,
    envMapIntensity: 0.42
  });
  // Только эти меши ярче порога bloom: emissive 8 при toneMapped:false, порог 3.4.
  const led = new THREE.MeshStandardMaterial({
    color: 0x00383c,
    emissive: PALETTE.cyan,
    emissiveIntensity: QUALITY.ledEmissive,
    toneMapped: false,
    roughness: 0.2
  });
  return { shell, joint, led };
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

export async function loadModel(url, renderer, mats, onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath("./js/vendor/three/examples/jsm/libs/draco/gltf/");
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total));

  normalize(gltf.scene);
  // Flatten: запекаем мировую матрицу в геометрию, все меши — прямые дети плоского root с identity-трансформом.
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) meshes.push(o); });
  const root = new THREE.Group();
  const parts = [];
  for (const obj of meshes) {
    obj.geometry = toFloat(obj.geometry).applyMatrix4(obj.matrixWorld);
    obj.name = obj.name || obj.parent?.name || "part";
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.set(1, 1, 1);
    const dark = obj.material?.color && obj.material.color.r < 0.4;
    obj.material = dark ? mats.joint : mats.shell;
    obj.castShadow = true;
    root.add(obj);
    registerPart(parts, obj);
  }
  draco.dispose();
  return { root, parts };
}

// meshopt/KHR_mesh_quantization отдают Int16/Int8 normalized и interleaved атрибуты => переводим в чистый Float32.
function toFloat(src) {
  const geo = new THREE.BufferGeometry();
  for (const [key, attr] of Object.entries(src.attributes)) {
    let data;
    if (!attr.isInterleavedBufferAttribute && !attr.normalized && attr.array instanceof Float32Array) {
      data = new Float32Array(attr.array);
    } else {
      data = new Float32Array(attr.count * attr.itemSize);
      for (let i = 0; i < attr.count; i++) {
        for (let k = 0; k < attr.itemSize; k++) data[i * attr.itemSize + k] = attr.getComponent(i, k);
      }
    }
    geo.setAttribute(key, new THREE.BufferAttribute(data, attr.itemSize));
  }
  if (src.index) geo.setIndex(src.index.clone());
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

// Реальный масштаб: высота = PRODUCT.height (м), центр по X/Z = 0, пол = y 0.
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

// Плейсхолдер: инженерная фигура в масштабе 1.32 м на случай отсутствия GLB.
export function placeholderModel(mats) {
  const root = new THREE.Group();
  const parts = [];
  const add = (name, geo, pos, dark) => {
    const m = new THREE.Mesh(geo, dark ? mats.joint : mats.shell);
    m.name = name;
    m.position.set(...pos);
    m.castShadow = true;
    root.add(m);
    registerPart(parts, m);
  };
  add("head_link", new THREE.CapsuleGeometry(0.085, 0.06, 8, 24), [0, 1.22, 0], true);
  add("logo_link", new THREE.BoxGeometry(0.06, 0.04, 0.12), [0.05, 1.06, 0]);
  add("torso_link", new THREE.BoxGeometry(0.2, 0.32, 0.22, 4, 4, 4), [0, 0.98, 0]);
  add("waist_yaw_link", new THREE.CylinderGeometry(0.05, 0.055, 0.06, 24), [0, 0.81, 0], true);
  add("pelvis_contour_link", new THREE.BoxGeometry(0.16, 0.13, 0.18), [0, 0.7, 0]);
  for (const [s, side] of [["left", -1], ["right", 1]]) {
    add(s + "_shoulder_roll_link", new THREE.SphereGeometry(0.055, 24, 16), [0, 1.05, side * 0.15]);
    add(s + "_elbow_link", new THREE.CapsuleGeometry(0.038, 0.16, 8, 16), [0, 0.86, side * 0.19], true);
    add(s + "_wrist_yaw_link", new THREE.CapsuleGeometry(0.034, 0.12, 8, 16), [0, 0.71, side * 0.21]);
    add(s + "_hand_dex3", new THREE.BoxGeometry(0.07, 0.14, 0.06), [0.02, 0.59, side * 0.22]);
    add(s + "_hip_yaw_link", new THREE.CapsuleGeometry(0.055, 0.22, 8, 16), [0, 0.45, side * 0.11], true);
    add(s + "_knee_link", new THREE.CapsuleGeometry(0.048, 0.24, 8, 16), [0, 0.21, side * 0.11]);
    add(s + "_ankle_roll_link", new THREE.BoxGeometry(0.2, 0.05, 0.08), [0.02, 0.025, side * 0.11], true);
  }
  return { root, parts };
}

// Циан-лампы (bloom) крепятся к детали в локальных координатах корпуса и едут вместе с ней.
export function addLamp(lamps, scene, part, local, geo, mat, rot = [0, 0, 0]) {
  if (!part) return;
  const lamp = new THREE.Mesh(geo, mat);
  lamp.rotation.set(rot[0], rot[1], rot[2]);
  lamp.userData = { part, local: new THREE.Vector3(...local) };
  lamps.push(lamp);
  scene.add(lamp);
}

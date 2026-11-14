// Builds an authentic architectural 3D GLB of Apptronik Apollo 2 (1.73 m, 36 DOF)
// Matched against official 2025-2026 Apollo 2 studio photography (assets/refs/).
// Usage: node tools/build_apollo_glb.mjs [out_raw.glb]
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Document, NodeIO } from "@gltf-transform/core";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outPath = path.resolve(process.argv[2] || "tools/.cache_3d/apollo_raw.glb");
fs.mkdirSync(path.dirname(outPath), { recursive: true });

// Minimal pure-Node RGBA PNG encoder (zero external deps, crisp embedded decals/HUD)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePngRGBA(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return new Uint8Array(Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]));
}

// Raster canvas helpers for crisp procedural textures
function makeRaster(w, h, bg = [0, 0, 0, 0]) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = bg[3];
  }
  const blend = (x, y, col) => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || ix >= w || iy < 0 || iy >= h) return;
    const p = (iy * w + ix) * 4;
    const sa = (col[3] ?? 255) / 255;
    if (sa <= 0) return;
    if (sa >= 0.999) {
      buf[p] = col[0]; buf[p + 1] = col[1]; buf[p + 2] = col[2]; buf[p + 3] = col[3] ?? 255;
      return;
    }
    const da = buf[p + 3] / 255;
    const oa = sa + da * (1 - sa);
    buf[p] = Math.round((col[0] * sa + buf[p] * da * (1 - sa)) / Math.max(1e-4, oa));
    buf[p + 1] = Math.round((col[1] * sa + buf[p + 1] * da * (1 - sa)) / Math.max(1e-4, oa));
    buf[p + 2] = Math.round((col[2] * sa + buf[p + 2] * da * (1 - sa)) / Math.max(1e-4, oa));
    buf[p + 3] = Math.round(oa * 255);
  };
  const fillRect = (x0, y0, rw, rh, col) => {
    const x1 = Math.ceil(x0 + rw), y1 = Math.ceil(y0 + rh);
    for (let y = Math.floor(y0); y < y1; y++) {
      for (let x = Math.floor(x0); x < x1; x++) blend(x, y, col);
    }
  };
  const fillRoundRect = (x0, y0, rw, rh, r, col) => {
    const x1 = Math.ceil(x0 + rw), y1 = Math.ceil(y0 + rh);
    for (let y = Math.floor(y0); y < y1; y++) {
      for (let x = Math.floor(x0); x < x1; x++) {
        const cx = Math.max(x0 + r, Math.min(x0 + rw - r, x));
        const cy = Math.max(y0 + r, Math.min(y0 + rh - r, y));
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r + 0.6) {
          const a = d <= r - 0.5 ? 1 : Math.max(0, r + 0.5 - d);
          blend(x, y, [col[0], col[1], col[2], Math.round((col[3] ?? 255) * a)]);
        }
      }
    }
  };
  const fillCircle = (cx, cy, rad, col) => {
    for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
      for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad + 0.7) {
          const a = d <= rad - 0.5 ? 1 : Math.max(0, rad + 0.5 - d);
          blend(x, y, [col[0], col[1], col[2], Math.round((col[3] ?? 255) * a)]);
        }
      }
    }
  };
  const drawSeg = (x0, y0, x1, y1, thick, col) => {
    const r = thick * 0.5;
    const minX = Math.floor(Math.min(x0, x1) - r - 1), maxX = Math.ceil(Math.max(x0, x1) + r + 1);
    const minY = Math.floor(Math.min(y0, y1) - r - 1), maxY = Math.ceil(Math.max(y0, y1) + r + 1);
    const dx = x1 - x0, dy = y1 - y0, len2 = Math.max(1e-6, dx * dx + dy * dy);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
        const d = Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
        if (d <= r + 0.7) {
          const a = d <= r - 0.5 ? 1 : Math.max(0, r + 0.5 - d);
          blend(x, y, [col[0], col[1], col[2], Math.round((col[3] ?? 255) * a)]);
        }
      }
    }
  };
  return { buf, blend, fillRect, fillRoundRect, fillCircle, drawSeg };
}

// Vector stroke alphabet for crisp spaced sans-serif captions (APPTRONIK / NET BAT VER SYS 123)
const GLYPHS = {
  A: [[0, 1, 0.5, 0], [0.5, 0, 1, 1], [0.18, 0.65, 0.82, 0.65]],
  P: [[0.1, 1, 0.1, 0], [0.1, 0, 0.75, 0], [0.75, 0, 0.92, 0.16], [0.92, 0.16, 0.92, 0.36], [0.92, 0.36, 0.75, 0.52], [0.75, 0.52, 0.1, 0.52]],
  T: [[0, 0, 1, 0], [0.5, 0, 0.5, 1]],
  R: [[0.1, 1, 0.1, 0], [0.1, 0, 0.75, 0], [0.75, 0, 0.92, 0.16], [0.92, 0.16, 0.92, 0.34], [0.92, 0.34, 0.75, 0.50], [0.75, 0.50, 0.1, 0.50], [0.55, 0.50, 0.95, 1]],
  O: [[0.25, 0, 0.75, 0], [0.75, 0, 0.95, 0.22], [0.95, 0.22, 0.95, 0.78], [0.95, 0.78, 0.75, 1], [0.75, 1, 0.25, 1], [0.25, 1, 0.05, 0.78], [0.05, 0.78, 0.05, 0.22], [0.05, 0.22, 0.25, 0]],
  N: [[0.1, 1, 0.1, 0], [0.1, 0, 0.9, 1], [0.9, 1, 0.9, 0]],
  I: [[0.28, 0, 0.72, 0], [0.5, 0, 0.5, 1], [0.28, 1, 0.72, 1]],
  K: [[0.12, 0, 0.12, 1], [0.88, 0, 0.14, 0.52], [0.34, 0.38, 0.92, 1]],
  E: [[0.85, 0, 0.12, 0], [0.12, 0, 0.12, 1], [0.12, 0.5, 0.72, 0.5], [0.12, 1, 0.85, 1]],
  B: [[0.12, 0, 0.12, 1], [0.12, 0, 0.72, 0], [0.72, 0, 0.86, 0.15], [0.86, 0.15, 0.86, 0.36], [0.86, 0.36, 0.70, 0.48], [0.12, 0.48, 0.74, 0.48], [0.74, 0.48, 0.90, 0.62], [0.90, 0.62, 0.90, 0.85], [0.90, 0.85, 0.74, 1], [0.74, 1, 0.12, 1]],
  V: [[0.08, 0, 0.5, 1], [0.5, 1, 0.92, 0]],
  S: [[0.86, 0.12, 0.72, 0], [0.72, 0, 0.28, 0], [0.28, 0, 0.12, 0.15], [0.12, 0.15, 0.12, 0.36], [0.12, 0.36, 0.28, 0.48], [0.28, 0.48, 0.74, 0.52], [0.74, 0.52, 0.90, 0.66], [0.90, 0.66, 0.90, 0.86], [0.90, 0.86, 0.74, 1], [0.74, 1, 0.24, 1], [0.24, 1, 0.10, 0.86]],
  Y: [[0.08, 0, 0.5, 0.5], [0.92, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 1]],
  "1": [[0.28, 0.18, 0.52, 0], [0.52, 0, 0.52, 1], [0.26, 1, 0.78, 1]],
  "2": [[0.14, 0.20, 0.30, 0], [0.30, 0, 0.74, 0], [0.74, 0, 0.88, 0.18], [0.88, 0.18, 0.88, 0.38], [0.88, 0.38, 0.14, 1], [0.14, 1, 0.90, 1]],
  "3": [[0.16, 0.10, 0.32, 0], [0.32, 0, 0.76, 0], [0.76, 0, 0.88, 0.18], [0.88, 0.18, 0.88, 0.36], [0.88, 0.36, 0.72, 0.48], [0.40, 0.48, 0.72, 0.48], [0.72, 0.48, 0.90, 0.62], [0.90, 0.62, 0.90, 0.84], [0.90, 0.84, 0.74, 1], [0.74, 1, 0.30, 1], [0.30, 1, 0.14, 0.88]],
  "4": [[0.72, 1, 0.72, 0], [0.72, 0, 0.10, 0.68], [0.10, 0.68, 0.92, 0.68]],
  "6": [[0.78, 0.06, 0.36, 0], [0.36, 0, 0.14, 0.24], [0.14, 0.24, 0.14, 0.80], [0.14, 0.80, 0.32, 1], [0.32, 1, 0.72, 1], [0.72, 1, 0.88, 0.82], [0.88, 0.82, 0.88, 0.60], [0.88, 0.60, 0.72, 0.46], [0.72, 0.46, 0.18, 0.46]],
  ".": [[0.45, 0.92, 0.55, 0.92]],
  " ": []
};

function drawWord(r, text, startX, y, gw, gh, gap, thick, col) {
  let x = startX;
  for (const ch of text) {
    const segs = GLYPHS[ch] || [];
    for (const [ax, ay, bx, by] of segs) {
      r.drawSeg(x + ax * gw, y + ay * gh, x + bx * gw, y + by * gh, thick, col);
    }
    x += gw + gap;
  }
}

function buildTextures() {
  // 1. Wordmark PNG: crisp widely-spaced black "APPTRONIK" on transparent background (512 x 96)
  const wm = makeRaster(512, 96, [0, 0, 0, 0]);
  drawWord(wm, "APPTRONIK", 42, 26, 28, 44, 21, 5.2, [34, 38, 46, 245]);

  // 2. Apptronik "A" peaked chevron monogram PNG for rear white battery cover (256 x 256)
  const mono = makeRaster(256, 256, [0, 0, 0, 0]);
  // Outer peaked A chevron & inner inverted V peak (matches apollo_back.jpg cleanly)
  mono.drawSeg(60, 198, 128, 56, 18, [30, 34, 42, 250]);
  mono.drawSeg(128, 56, 196, 198, 18, [30, 34, 42, 250]);
  mono.drawSeg(92, 194, 128, 124, 15, [30, 34, 42, 250]);
  mono.drawSeg(128, 124, 164, 194, 15, [30, 34, 42, 250]);
  mono.drawSeg(58, 198, 92, 194, 15, [30, 34, 42, 250]);
  mono.drawSeg(164, 194, 198, 198, 15, [30, 34, 42, 250]);

  // 3. Chest OLED UI PNG (512 x 320, deep glossy obsidian with NET/BAT/123/VER/SYS status matching apollo_chest.jpg)
  const hud = makeRaster(512, 320, [8, 10, 15, 255]);
  // Soft inner glassy vignette
  hud.fillRoundRect(10, 10, 492, 300, 34, [11, 14, 22, 255]);
  // Subtle Apptronik chevron mark top center
  hud.drawSeg(244, 52, 256, 30, 4.2, [130, 155, 195, 220]);
  hud.drawSeg(256, 30, 268, 52, 4.2, [130, 155, 195, 220]);
  // Subtle Mind-Apollo labels + crisp cyan/white status HUD (upper band above central camera lens)
  drawWord(hud, "NET", 68, 54, 11, 18, 6, 2.8, [145, 175, 215, 220]);
  drawWord(hud, "BAT", 136, 54, 11, 18, 6, 2.8, [145, 175, 215, 220]);
  drawWord(hud, "VER", 326, 54, 11, 18, 6, 2.8, [145, 175, 215, 220]);
  drawWord(hud, "SYS", 394, 54, 11, 18, 6, 2.8, [145, 175, 215, 220]);
  // Wi-Fi / Signal arcs (blue-cyan)
  hud.fillCircle(86, 118, 5.5, [40, 155, 255, 240]);
  hud.drawSeg(72, 106, 86, 98, 3.6, [40, 155, 255, 230]);
  hud.drawSeg(86, 98, 100, 106, 3.6, [40, 155, 255, 230]);
  // Battery bar icon (bright cyan-white fill)
  hud.fillRoundRect(142, 84, 26, 46, 4, [160, 175, 195, 170]);
  hud.fillRoundRect(145, 92, 20, 35, 2, [0, 240, 255, 235]);
  // Big centered unit index "123" in crisp off-white
  drawWord(hud, "123", 206, 84, 26, 46, 12, 5.6, [238, 244, 252, 255]);
  // VER & SYS emerald check badges
  hud.fillCircle(346, 106, 17, [38, 192, 92, 235]);
  hud.drawSeg(338, 106, 344, 113, 3.8, [12, 20, 16, 255]);
  hud.drawSeg(344, 113, 355, 98, 3.8, [12, 20, 16, 255]);
  hud.fillCircle(414, 106, 17, [38, 192, 92, 235]);
  hud.drawSeg(406, 106, 412, 113, 3.8, [12, 20, 16, 255]);
  hud.drawSeg(412, 113, 423, 98, 3.8, [12, 20, 16, 255]);
  drawWord(hud, "2.6.4", 322, 134, 8, 13, 5, 2.2, [175, 195, 220, 220]);
  // Subtle optical ring highlight around lower-center camera zone
  hud.fillCircle(256, 224, 46, [14, 18, 28, 255]);
  hud.fillCircle(256, 224, 40, [6, 8, 14, 255]);

  return {
    wordmark: encodePngRGBA(512, 96, wm.buf),
    monogram: encodePngRGBA(256, 256, mono.buf),
    chestUi: encodePngRGBA(512, 320, hud.buf)
  };
}

// Smooth superellipsoid lofted shell: preserves indexed smooth normals BEFORE non-indexed flatten!
function makeLoftedShell(profile, radialSegs = 36, squircle = 2.4, zCenterFn = null) {
  const rings = profile.length;
  const cols = radialSegs + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < rings; i++) {
    const [y, rx, rz, cx = 0] = profile[i];
    const cz = zCenterFn ? zCenterFn(i, y) : 0;
    const v = i / (rings - 1);
    for (let j = 0; j < cols; j++) {
      const a = (j / radialSegs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const p = 2 / squircle;
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), p);
      const sz = Math.sign(sa) * Math.pow(Math.abs(sa), p);
      positions.push(cx + rx * sx, y, cz + rz * sz);
      uvs.push(j / radialSegs, v);
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + (j + 1);
      const d = i * cols + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Pole closure caps (outward CCW normals: -Y bottom, +Y top)
  const [yBot, , , cxBot = 0] = profile[0];
  const botIdx = positions.length / 3;
  positions.push(cxBot, yBot, zCenterFn ? zCenterFn(0, yBot) : 0);
  uvs.push(0.5, 0);
  for (let j = 0; j < radialSegs; j++) indices.push(botIdx, j, j + 1);

  const [yTop, , , cxTop = 0] = profile[rings - 1];
  const topIdx = positions.length / 3;
  positions.push(cxTop, yTop, zCenterFn ? zCenterFn(rings - 1, yTop) : 0);
  uvs.push(0.5, 1);
  const topBase = (rings - 1) * cols;
  for (let j = 0; j < radialSegs; j++) indices.push(topIdx, topBase + j + 1, topBase + j);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // Seam wrap fix: average seam normals at j=0 and j=radialSegs so closed loft has zero vertical crease!
  const norm = geo.getAttribute("normal");
  for (let i = 0; i < rings; i++) {
    const a = i * cols;
    const b = i * cols + radialSegs;
    const nx = (norm.getX(a) + norm.getX(b)) * 0.5;
    const ny = (norm.getY(a) + norm.getY(b)) * 0.5;
    const nz = (norm.getZ(a) + norm.getZ(b)) * 0.5;
    const len = Math.hypot(nx, ny, nz) || 1;
    norm.setXYZ(a, nx / len, ny / len, nz / len);
    norm.setXYZ(b, nx / len, ny / len, nz / len);
  }
  norm.needsUpdate = true;
  return geo;
}

// Compute normals BEFORE converting to non-indexed triangles, and transform normals cleanly!
function normPart(geo, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  let base = geo;
  if (!base.attributes.normal) {
    base = base.clone();
    base.computeVertexNormals();
  }
  let g = base.index ? base.toNonIndexed() : base.clone();
  if (!g.attributes.uv) {
    const cnt = g.attributes.position.count;
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(cnt * 2), 2));
  }
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(tx, ty, tz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  g.applyMatrix4(m);
  return g;
}

// CRITICAL: Do NOT call merged.computeVertexNormals() here because meshes are non-indexed!
function mergeList(geos) {
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingBox();
  return merged;
}

function makeBevelBox(w, h, d, r = 0.014, bevel = 0.008) {
  const rr = Math.min(r, w * 0.46, h * 0.46);
  const hw = w / 2 - rr;
  const hh = h / 2 - rr;
  const s = new THREE.Shape();
  s.moveTo(-hw, -hh - rr);
  s.lineTo(hw, -hh - rr);
  s.quadraticCurveTo(hw + rr, -hh - rr, hw + rr, -hh);
  s.lineTo(hw + rr, hh);
  s.quadraticCurveTo(hw + rr, hh + rr, hw, hh + rr);
  s.lineTo(-hw, hh + rr);
  s.quadraticCurveTo(-hw - rr, hh + rr, -hw - rr, hh);
  s.lineTo(-hw - rr, -hh);
  s.quadraticCurveTo(-hw - rr, -hh - rr, -hw, -hh - rr);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.003, d - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 12
  });
  g.center();
  return g;
}

// Rounded trapezoid bevel plate (Apollo 2 front chest display / faceplate)
function makeTrapPlate(wTop, wBot, h, d, r = 0.022, bevel = 0.005) {
  const ht = wTop * 0.5, hb = wBot * 0.5, hh = h * 0.5;
  const s = new THREE.Shape();
  s.moveTo(-hb + r, -hh);
  s.lineTo(hb - r, -hh);
  s.quadraticCurveTo(hb, -hh, hb, -hh + r);
  s.lineTo(ht, hh - r);
  s.quadraticCurveTo(ht, hh, ht - r, hh);
  s.lineTo(-ht + r, hh);
  s.quadraticCurveTo(-ht, hh, -ht, hh - r);
  s.lineTo(-hb, -hh + r);
  s.quadraticCurveTo(-hb, -hh, -hb + r, -hh);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.003, d - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12
  });
  g.center();
  return g;
}

// Front-facing textured quad in YZ plane facing +X (or -X when flipX = true), GLTF-matched UV (top PNG row -> top +Y vertex)
function makeDecalQuad(wZ, hY, flipX = false) {
  const g = new THREE.PlaneGeometry(wZ, hY);
  if (flipX) {
    g.rotateY(-Math.PI / 2);
  } else {
    g.rotateY(Math.PI / 2);
  }
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  uv.needsUpdate = true;
  return g;
}

const parts = []; // { name, matKey, geo }

// 1. HEAD HELMET SHELL (1.518..1.730m, razor-smooth rounded aerodynamic helmet + flushed ear trim)
parts.push({
  name: "head_link",
  matKey: "shell",
  geo: mergeList([
    normPart(makeLoftedShell([
      [1.518, 0.036, 0.032, -0.004],
      [1.530, 0.054, 0.047, -0.005],
      [1.546, 0.068, 0.058, -0.006],
      [1.566, 0.078, 0.065, -0.007],
      [1.590, 0.084, 0.069, -0.008],
      [1.616, 0.086, 0.071, -0.008],
      [1.644, 0.085, 0.070, -0.008],
      [1.670, 0.080, 0.066, -0.008],
      [1.692, 0.071, 0.059, -0.008],
      [1.709, 0.058, 0.049, -0.008],
      [1.721, 0.041, 0.035, -0.008],
      [1.727, 0.024, 0.021, -0.008],
      [1.730, 0.010, 0.010, -0.008],
    ], 48, 2.18), 0, 0, 0),
    // Soft contoured ear acoustic housings on +/-Z
    normPart(makeBevelBox(0.050, 0.080, 0.142, 0.022, 0.005), -0.008, 1.614, 0),
  ]),
});

// 1b. PALE FLUSH OVAL FACEPLATE (Apollo 2 signature light off-white oval plate seated cleanly over helmet front!)
parts.push({
  name: "head_faceplate",
  matKey: "faceplate",
  geo: mergeList([
    normPart(makeBevelBox(0.094, 0.140, 0.014, 0.041, 0.004), 0.074, 1.612, 0, 0, Math.PI / 2, 0),
  ]),
});

// 2. STEREO CAMERA EYES + SIDE PERFORATED GRILLES + SUBTLE FACE REVEAL BEZEL (grouped under "head")
parts.push({
  name: "head_visor_glass",
  matKey: "glass",
  geo: mergeList([
    // Thin dark reveal rim framing the pale oval faceplate inside helmet
    normPart(makeBevelBox(0.100, 0.146, 0.012, 0.043, 0.003), 0.0705, 1.612, 0, 0, Math.PI / 2, 0),
    // Two dark circular stereo camera bezels flush in upper faceplate
    normPart(new THREE.CylinderGeometry(0.0105, 0.0105, 0.007, 28), 0.0795, 1.625, -0.024, 0, 0, Math.PI / 2),
    normPart(new THREE.CylinderGeometry(0.0105, 0.0105, 0.007, 28), 0.0795, 1.625,  0.024, 0, 0, Math.PI / 2),
    // Glossy optical sapphire camera lenses slightly proud of bezels
    normPart(new THREE.SphereGeometry(0.0076, 22, 16), 0.0820, 1.625, -0.024),
    normPart(new THREE.SphereGeometry(0.0076, 22, 16), 0.0820, 1.625,  0.024),
    // Subtle dark flush side acoustic mesh ovals on +/-Z temple
    normPart(makeBevelBox(0.044, 0.070, 0.145, 0.018, 0.002), -0.012, 1.614, 0),
  ]),
});

// 3. NECK COLUMN & COLLAR GIMBAL (dark graphite)
parts.push({
  name: "neck_link",
  matKey: "joint",
  geo: mergeList([
    normPart(new THREE.CylinderGeometry(0.036, 0.042, 0.088, 28), -0.006, 1.490, 0),
    normPart(new THREE.CylinderGeometry(0.050, 0.056, 0.024, 30), -0.006, 1.454, 0),
    normPart(new THREE.CylinderGeometry(0.041, 0.041, 0.010, 28), -0.006, 1.488, 0),
  ]),
});

// 4. TORSO SHELL (1.07..1.45m, smooth continuous matte carapace, clean sternum & tapered shoulders)
parts.push({
  name: "torso_link",
  matKey: "shell",
  geo: mergeList([
    normPart(makeLoftedShell([
      [1.072, 0.084, 0.112, 0.000],
      [1.135, 0.098, 0.128, 0.004],
      [1.210, 0.106, 0.148, 0.007],
      [1.290, 0.110, 0.165, 0.008],
      [1.365, 0.108, 0.172, 0.006],
      [1.410, 0.096, 0.156, 0.002],
      [1.438, 0.070, 0.112, -0.004],
      [1.454, 0.046, 0.068, -0.006],
    ], 48, 2.75), 0, 0, 0),
  ]),
});

// 4b. LOWER CHEST SENSOR BAR & INTAKE SLOT (apollo_chest.jpg: dark pill bar with 4 optical lenses)
parts.push({
  name: "torso_sensor_bar",
  matKey: "glass",
  geo: mergeList([
    // Rounded horizontal black 4-sensor bar right below upper display
    normPart(makeBevelBox(0.090, 0.018, 0.010, 0.009, 0.002), 0.118, 1.258, 0, 0, Math.PI / 2, 0),
    // 4 tiny optical sensor lens domes inside the pill bar
    normPart(new THREE.SphereGeometry(0.0050, 14, 10), 0.1225, 1.258, -0.031),
    normPart(new THREE.SphereGeometry(0.0050, 14, 10), 0.1225, 1.258, -0.0105),
    normPart(new THREE.SphereGeometry(0.0050, 14, 10), 0.1225, 1.258,  0.0105),
    normPart(new THREE.SphereGeometry(0.0050, 14, 10), 0.1225, 1.258,  0.031),
    // Subtle dark front lower torso intake slot (apollo_front.jpg)
    normPart(makeBevelBox(0.072, 0.010, 0.008, 0.004, 0.001), 0.098, 1.106, 0, 0, Math.PI / 2, 0),
  ]),
});

// 5. CHEST DISPLAY PANEL + PROTRUDING LOWER CAMERA + CRISP APPTRONIK WORDMARK (grouped to "logo")
parts.push({
  name: "logo_link",
  matKey: "glass",
  geo: mergeList([
    // Smooth wide rounded-trapezoid obsidian display bezel flush against sternum
    normPart(makeTrapPlate(0.160, 0.134, 0.090, 0.015, 0.022, 0.004), 0.119, 1.334, 0, 0, Math.PI / 2, -0.05),
    // Protruding central camera lens barrel + dome near bottom of chest display
    normPart(new THREE.CylinderGeometry(0.016, 0.018, 0.013, 24), 0.127, 1.312, 0, 0, 0, Math.PI / 2),
    normPart(new THREE.SphereGeometry(0.012, 20, 14), 0.133, 1.312, 0),
  ]),
});

parts.push({
  name: "logo_chest_ui",
  matKey: "chestUi",
  geo: mergeList([
    // Thin display OLED UI overlay flush in front of obsidian glass bezel
    normPart(makeDecalQuad(0.136, 0.080, false), 0.1272, 1.334, 0, 0, 0, -0.05),
  ]),
});

parts.push({
  name: "logo_wordmark",
  matKey: "wordmark",
  geo: mergeList([
    // Centered widely-spaced APPTRONIK lettering below 4-sensor bar
    normPart(makeDecalQuad(0.092, 0.017, false), 0.1155, 1.224, 0, 0, 0, -0.03),
  ]),
});

// 6. HOT-SWAPPABLE BACKPACK BATTERY PACK + FRAME + SIDE 3-LENS CAMERA CLUSTERS + E-STOP + ANTENNA + GREEN LED
parts.push({
  name: "battery_pack_link",
  matKey: "joint",
  geo: mergeList([
    // Dark structural backpack carrier frame
    normPart(makeBevelBox(0.226, 0.310, 0.068, 0.022, 0.008), -0.126, 1.242, 0, 0, Math.PI / 2, 0),
    // Top carry handle grab arch
    normPart(makeBevelBox(0.118, 0.030, 0.036, 0.008, 0.004), -0.138, 1.412, 0, 0, Math.PI / 2, 0),
    // Top telemetry housing bridge
    normPart(makeBevelBox(0.190, 0.042, 0.056, 0.010, 0.005), -0.120, 1.388, 0, 0, Math.PI / 2, 0),
    // Twin vertical 3-lens perception camera pods flanking upper backpack sides (apollo_back.jpg)
    ...[-1, 1].flatMap((s) => [
      normPart(makeBevelBox(0.034, 0.132, 0.038, 0.012, 0.005), -0.136, 1.318, s * 0.130, 0, Math.PI / 2, 0),
      normPart(new THREE.SphereGeometry(0.007, 14, 10), -0.154, 1.356, s * 0.130),
      normPart(new THREE.SphereGeometry(0.007, 14, 10), -0.154, 1.318, s * 0.130),
      normPart(new THREE.SphereGeometry(0.007, 14, 10), -0.154, 1.280, s * 0.130),
    ]),
    // Thin black radio antenna stub on operator left (-Z) shoulder ridge
    normPart(new THREE.CylinderGeometry(0.0038, 0.0050, 0.105, 12), -0.072, 1.462, -0.148),
  ]),
});

// White removable battery pack shell (battery_ prefix -> stays in "torso" group)
parts.push({
  name: "battery_pack_shell",
  matKey: "shell",
  geo: mergeList([
    // Rounded matte-white swappable battery lid seated inside black frame
    normPart(makeBevelBox(0.194, 0.272, 0.028, 0.028, 0.009), -0.162, 1.224, 0, 0, Math.PI / 2, 0),
    // Rear white umbilical power cable pair dropping to waist (apollo_back.jpg)
    normPart(new THREE.CylinderGeometry(0.010, 0.010, 0.115, 12), -0.095, 1.045, -0.032, 0.10, 0, -0.12),
    normPart(new THREE.CylinderGeometry(0.010, 0.010, 0.115, 12), -0.095, 1.045,  0.032, -0.10, 0, -0.12),
  ]),
});

parts.push({
  name: "battery_monogram",
  matKey: "monogram",
  geo: mergeList([
    // Centered Apptronik "A" monogram decal on rear white battery panel (-X face)
    normPart(makeDecalQuad(0.042, 0.042, true), -0.1775, 1.240, 0),
  ]),
});

parts.push({
  name: "battery_estop",
  matKey: "estop",
  geo: mergeList([
    // Red emergency-stop mushroom button on operator left (-Z) upper pack corner
    normPart(new THREE.CylinderGeometry(0.015, 0.013, 0.016, 20), -0.095, 1.430, -0.108),
  ]),
});

parts.push({
  name: "battery_green_led",
  matKey: "greenLed",
  geo: mergeList([
    // Green operational status light bar on top of backpack
    normPart(makeBevelBox(0.068, 0.012, 0.022, 0.005, 0.002), -0.128, 1.432, 0.018, 0, Math.PI / 2, 0),
  ]),
});

// 7. SLENDER EXPOSED BLACK WAIST & OPEN PELVIS MECHANICS (0.83..1.08m, signature Apollo 2 silhouette!)
parts.push({
  name: "waist_yaw_link",
  matKey: "joint",
  geo: mergeList([
    // Slender rotary central spine column in open midsection
    normPart(new THREE.CylinderGeometry(0.056, 0.062, 0.108, 28), 0.002, 1.028, 0),
    normPart(new THREE.CylinderGeometry(0.072, 0.072, 0.026, 28), 0.002, 0.990, 0),
    // Twin diagonal stabilization rods flanking waist column
    normPart(new THREE.CylinderGeometry(0.011, 0.011, 0.115, 14), -0.048, 1.025, -0.052, 0.14, 0, 0),
    normPart(new THREE.CylinderGeometry(0.011, 0.011, 0.115, 14), -0.048, 1.025,  0.052, -0.14, 0, 0),
  ]),
});

parts.push({
  name: "pelvis",
  matKey: "joint",
  geo: mergeList([
    // Central dark structural hip block
    normPart(makeBevelBox(0.185, 0.086, 0.135, 0.018, 0.006), -0.006, 0.924, 0, 0, Math.PI / 2, 0),
    // Left & right exposed rotary hip motor drums + ball-joint outer linkage ears (apollo_front.jpg silhouette!)
    ...[-1, 1].flatMap((s) => [
      normPart(new THREE.CylinderGeometry(0.048, 0.048, 0.068, 24), 0.002, 0.916, s * 0.098, Math.PI / 2, 0, 0),
      normPart(new THREE.CylinderGeometry(0.036, 0.036, 0.052, 20), 0.008, 0.875, s * 0.108),
      // Signature outer lateral tie-rod ball-joints at hip height
      normPart(new THREE.CylinderGeometry(0.008, 0.008, 0.055, 12), 0.006, 0.880, s * 0.144, 0.42 * s, 0, 0),
      normPart(new THREE.SphereGeometry(0.017, 16, 12), 0.006, 0.878, s * 0.168),
      // Inner hip linkage pistons dropping cleanly behind top edge of thigh cuff
      normPart(new THREE.CylinderGeometry(0.013, 0.012, 0.105, 14), 0.016, 0.848, s * 0.096, 0, 0, 0.06),
      normPart(new THREE.CylinderGeometry(0.013, 0.012, 0.105, 14), -0.022, 0.848, s * 0.116, 0, 0, -0.06),
    ]),
  ]),
});

parts.push({
  name: "pelvis_contour_link",
  matKey: "shell",
  geo: mergeList([
    // Compact smooth rounded pale center front shield (only covering center crotch, keeping hip motors open!)
    normPart(makeLoftedShell([
      [0.858, 0.046, 0.036, 0.014],
      [0.892, 0.058, 0.046, 0.016],
      [0.934, 0.060, 0.048, 0.014],
      [0.958, 0.048, 0.040, 0.010],
    ], 30, 2.5), 0, 0, 0),
  ]),
});

// 8. LEFT & RIGHT ARMS + EXPOSED INNER-ARM ACTUATORS + WHITE-BACKED / BLACK-PALMED 5-FINGER HANDS
for (const [sideName, sign] of [["left", -1], ["right", 1]]) {
  const shoulderZ = sign * 0.204;
  const elbowZ = sign * 0.224;
  const wristZ = sign * 0.236;

  // Exposed dark shoulder gimbal + neatly tucked inner upper-arm actuator bay (apollo_chest.jpg / apollo_head.jpg)
  parts.push({
    name: `${sideName}_shoulder_roll_link`,
    matKey: "joint",
    geo: mergeList([
      // Inner rotary shoulder joint collar bridging torso socket into deltoid cap
      normPart(new THREE.CylinderGeometry(0.044, 0.044, 0.068, 24), 0.004, 1.384, shoulderZ * 0.86, Math.PI / 2, 0, 0),
      // Sleek recessed cylindrical linear actuator bay tucked strictly on inner bicep face (-Z side of arm)
      normPart(new THREE.CylinderGeometry(0.020, 0.020, 0.092, 20), 0.002, 1.244, shoulderZ - sign * 0.015),
      normPart(makeBevelBox(0.032, 0.084, 0.024, 0.005, 0.002), 0.002, 1.246, shoulderZ - sign * 0.017),
    ]),
  });

  // Matte-white sculpted deltoid bell & outer upper-arm sleeve (smooth continuous single cap bridging torso shoulder)
  parts.push({
    name: `${sideName}_shoulder_yaw_link`,
    matKey: "shell",
    geo: mergeList([
      // Single sleek anatomical deltoid cap (no double-sphere bulge)
      normPart(new THREE.SphereGeometry(0.056, 30, 22), 0.004, 1.382, shoulderZ + sign * 0.004, 0, 0, 0, 0.94, 1.06, 0.88),
      // Smooth sculpted outer/rear biceps shell tapering toward elbow while exposing inner actuator bay
      normPart(makeLoftedShell([
        [1.132, 0.036, 0.034, -0.003],
        [1.198, 0.042, 0.036, -0.005],
        [1.275, 0.045, 0.036, -0.006],
        [1.345, 0.047, 0.042, -0.003],
        [1.385, 0.041, 0.040, 0.000],
      ], 34, 2.3), 0.003, 0, shoulderZ + sign * 0.014),
    ]),
  });

  // Exposed black elbow fork housing + twin linear forearm actuator struts (apollo_hands.jpg!)
  parts.push({
    name: `${sideName}_elbow_link`,
    matKey: "joint",
    geo: mergeList([
      normPart(new THREE.CylinderGeometry(0.036, 0.036, 0.068, 24), 0.002, 1.114, elbowZ, Math.PI / 2, 0, 0),
      // Inner elbow/upper forearm exposed rotary & piston yoke
      normPart(makeBevelBox(0.042, 0.095, 0.044, 0.008, 0.003), 0.002, 1.060, elbowZ - sign * 0.008),
      normPart(new THREE.CylinderGeometry(0.016, 0.018, 0.21, 16), -0.010, 0.980, elbowZ - sign * 0.012, 0, 0, -0.04),
    ]),
  });

  // Sleek tapered matte-white forearm fairing + rounded white elbow cap (y=0.84..1.12m)
  parts.push({
    name: `${sideName}_wrist_yaw_link`,
    matKey: "shell",
    geo: mergeList([
      normPart(makeLoftedShell([
        [0.842, 0.028, 0.024, 0.008],
        [0.910, 0.036, 0.031, 0.008],
        [0.990, 0.043, 0.037, 0.006],
        [1.068, 0.042, 0.038, 0.004],
        [1.118, 0.035, 0.034, -0.004],
      ], 30, 2.4), 0.010, 0, (elbowZ + wristZ) * 0.5 + sign * 0.006),
    ]),
  });

  // 5-Finger Dexterous Hand: split cleanly into WHITE DORSAL SHELL (outer) + BLACK PALMAR PADS (inner)!
  const fingerOffsetsX = [0.020, 0.007, -0.007, -0.020];
  const fingerLens = [0.056, 0.062, 0.057, 0.046];

  const handWhiteGeos = [
    // Contoured white dorsal palm back plate (outer +Z/-Z face away from body)
    normPart(makeBevelBox(0.064, 0.072, 0.016, 0.012, 0.004), 0.022, 0.782, wristZ + sign * 0.006, 0, Math.PI / 2, 0),
  ];
  const handBlackGeos = [
    // Dark compact wrist gimbal puck
    normPart(new THREE.CylinderGeometry(0.022, 0.024, 0.028, 22), 0.018, 0.826, wristZ),
    // Black palmar gripping core facing inward toward thighs (apollo_hands.jpg)
    normPart(makeBevelBox(0.060, 0.068, 0.014, 0.010, 0.003), 0.022, 0.782, wristZ - sign * 0.005, 0, Math.PI / 2, 0),
  ];

  fingerOffsetsX.forEach((fx, fi) => {
    const fl = fingerLens[fi];
    // Dorsal white upper phalanges + inner black pad strips (realistic thin articulated fingers!)
    handWhiteGeos.push(
      normPart(new THREE.CapsuleGeometry(0.0058, fl * 0.50, 6, 12), 0.022 + fx, 0.730, wristZ + sign * 0.002, 0.14 * sign, 0, 0.05),
      normPart(new THREE.CapsuleGeometry(0.0050, fl * 0.40, 6, 12), 0.024 + fx, 0.696, wristZ - sign * 0.006, 0.34 * sign, 0, 0.08)
    );
    handBlackGeos.push(
      normPart(new THREE.CapsuleGeometry(0.0048, fl * 0.44, 5, 10), 0.022 + fx, 0.730, wristZ - sign * 0.004, 0.14 * sign, 0, 0.05),
      normPart(new THREE.CapsuleGeometry(0.0044, fl * 0.36, 5, 10), 0.024 + fx, 0.695, wristZ - sign * 0.011, 0.34 * sign, 0, 0.08)
    );
  });

  // Opposable thumb on +X side (white dorsal cap + black inner pad)
  handWhiteGeos.push(
    normPart(new THREE.CapsuleGeometry(0.0066, 0.032, 6, 12), 0.048, 0.770, wristZ + sign * 0.001, 0.40 * sign, 0, -0.34),
    normPart(new THREE.CapsuleGeometry(0.0055, 0.024, 6, 12), 0.056, 0.744, wristZ - sign * 0.008, 0.58 * sign, 0, -0.20)
  );
  handBlackGeos.push(
    normPart(new THREE.CapsuleGeometry(0.0056, 0.028, 5, 10), 0.046, 0.768, wristZ - sign * 0.007, 0.40 * sign, 0, -0.34),
    normPart(new THREE.CapsuleGeometry(0.0048, 0.020, 5, 10), 0.054, 0.742, wristZ - sign * 0.014, 0.58 * sign, 0, -0.20)
  );

  parts.push({
    name: `${sideName}_hand_dex3`,
    matKey: "shell",
    geo: mergeList(handWhiteGeos),
  });
  parts.push({
    name: `${sideName}_hand_palm_joint`,
    matKey: "joint",
    geo: mergeList(handBlackGeos),
  });
}

// 9. LEFT & RIGHT LEGS (Smooth white thighs + kneecaps + shins + rear actuator rods + compact black feet)
for (const [sideName, sign] of [["left", -1], ["right", 1]]) {
  const legZ = sign * 0.106;

  // Thigh matte-white smooth tapered armor (clean horizontal top rim at 0.838m leaving black hip exposed above!)
  parts.push({
    name: `${sideName}_hip_yaw_link`,
    matKey: "shell",
    geo: mergeList([
      normPart(makeLoftedShell([
        [0.514, 0.052, 0.048, 0.006],
        [0.610, 0.064, 0.058, 0.010],
        [0.725, 0.072, 0.066, 0.010],
        [0.818, 0.070, 0.066, 0.008],
        [0.842, 0.058, 0.056, 0.006],
      ], 34, 2.3), 0.002, 0, legZ),
    ]),
  });

  // Hip-to-knee recessed black internal joint core + black knee rotary drum (cleanly tucked inside thigh shell!)
  parts.push({
    name: `${sideName}_hip_roll_link`,
    matKey: "joint",
    geo: mergeList([
      normPart(new THREE.CylinderGeometry(0.044, 0.044, 0.080, 24), 0.002, 0.858, legZ, Math.PI / 2, 0, 0),
      // Rear internal thigh linear actuator (tucked neatly BEHIND white thigh, NEVER clipping through front skin!)
      normPart(new THREE.CylinderGeometry(0.019, 0.016, 0.31, 18), -0.048, 0.680, legZ),
      // Dark knee joint rotary drum
      normPart(new THREE.CylinderGeometry(0.044, 0.044, 0.086, 24), 0.002, 0.488, legZ, Math.PI / 2, 0, 0),
      // Dark side recess inserts along lower thigh flanks (apollo_front.jpg)
      normPart(makeBevelBox(0.036, 0.074, 0.014, 0.008, 0.002), -0.004, 0.568, legZ + sign * 0.052),
    ]),
  });

  // White shin / calf fairing + rounded matte-white KNEECAP SHIELD (patella, apollo_front.jpg!)
  parts.push({
    name: `${sideName}_knee_link`,
    matKey: "shell",
    geo: mergeList([
      // Distinct rounded oval front kneecap plate sitting cleanly over front of knee drum
      normPart(makeBevelBox(0.066, 0.078, 0.022, 0.024, 0.007), 0.052, 0.486, legZ, 0, Math.PI / 2, 0),
      // Tapered white shin & calf armor
      normPart(makeLoftedShell([
        [0.106, 0.032, 0.030, 0.010],
        [0.195, 0.044, 0.040, 0.012],
        [0.315, 0.054, 0.050, 0.012],
        [0.425, 0.056, 0.052, 0.008],
        [0.464, 0.042, 0.042, 0.004],
      ], 32, 2.3), 0, 0, legZ),
    ]),
  });

  // Rear twin linear ankle actuators + ankle joint gimbal (black hardware tucked neatly behind white calf!)
  parts.push({
    name: `${sideName}_knee_actuator_link`,
    matKey: "joint",
    geo: mergeList([
      normPart(new THREE.CylinderGeometry(0.012, 0.010, 0.275, 16), -0.042, 0.280, legZ - 0.016),
      normPart(new THREE.CylinderGeometry(0.012, 0.010, 0.275, 16), -0.042, 0.280, legZ + 0.016),
      normPart(new THREE.CylinderGeometry(0.030, 0.030, 0.068, 22), 0.004, 0.088, legZ, Math.PI / 2, 0, 0),
    ]),
  });

  // Compact blocky matte-black industrial foot grounded cleanly at y = 0.000m (apollo_front.jpg!)
  parts.push({
    name: `${sideName}_ankle_roll_link`,
    matKey: "joint",
    geo: mergeList([
      // Grounded compact sole (y=0.000..0.028m, length 0.196m, width 0.084m)
      normPart(makeBevelBox(0.084, 0.028, 0.196, 0.018, 0.005), 0.036, 0.014, legZ, 0, Math.PI / 2, 0),
      // Upper beveled ankle block / toe ridge (y=0.024..0.060m)
      normPart(makeBevelBox(0.072, 0.034, 0.132, 0.016, 0.005), 0.020, 0.041, legZ, 0, Math.PI / 2, 0),
    ]),
  });
}

// Compute overall height & center for exact 1.730m normalization
const allBox = new THREE.Box3();
for (const p of parts) {
  p.geo.computeBoundingBox();
  allBox.union(p.geo.boundingBox);
}
const rawH = allBox.max.y - allBox.min.y;
const rawCenter = allBox.getCenter(new THREE.Vector3());
const scale = 1.73 / (rawH || 1.73);
for (const p of parts) {
  // Preserve vertical spine axis (x = 0) while grounding feet at y = 0 and centering left/right Z
  p.geo.translate(0, -allBox.min.y, -rawCenter.z);
  p.geo.scale(scale, scale, scale);
  p.geo.computeBoundingBox();
}

// Generate crisp PNG textures and build GLB materials
const texPngs = buildTextures();
const doc = new Document();
const buf = doc.createBuffer("apollo_buffer");

const texWordmark = doc.createTexture("apollo_wordmark_tex").setImage(texPngs.wordmark).setMimeType("image/png");
const texMonogram = doc.createTexture("apollo_monogram_tex").setImage(texPngs.monogram).setMimeType("image/png");
const texChestUi = doc.createTexture("apollo_chest_ui_tex").setImage(texPngs.chestUi).setMimeType("image/png");

const matMap = {
  // Cool matte off-white/light-gray production shell (linear ~0.83 => sRGB #eaecf0)
  shell: doc.createMaterial("apollo_shell").setBaseColorFactor([0.84, 0.85, 0.87, 1.0]).setRoughnessFactor(0.46).setMetallicFactor(0.04),
  // Pale slightly cooler oval faceplate inside helmet bezel
  faceplate: doc.createMaterial("apollo_faceplate").setBaseColorFactor([0.82, 0.835, 0.86, 1.0]).setRoughnessFactor(0.44).setMetallicFactor(0.04),
  // Matte black aluminum/composite structure & joints
  joint: doc.createMaterial("apollo_joint").setBaseColorFactor([0.055, 0.062, 0.078, 1.0]).setRoughnessFactor(0.42).setMetallicFactor(0.62),
  // Glossy obsidian chest glass & sapphire camera lenses
  glass: doc.createMaterial("apollo_glass").setBaseColorFactor([0.015, 0.018, 0.028, 1.0]).setRoughnessFactor(0.11).setMetallicFactor(0.30),
  // Textured Chest OLED dashboard
  chestUi: doc.createMaterial("apollo_chest_ui").setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(texChestUi).setRoughnessFactor(0.12).setMetallicFactor(0.20),
  // Textured APPTRONIK chest wordmark decal
  wordmark: doc.createMaterial("apollo_wordmark").setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(texWordmark).setAlphaMode("MASK").setAlphaCutoff(0.35).setRoughnessFactor(0.55),
  // Textured Apptronik "A" back monogram decal
  monogram: doc.createMaterial("apollo_back_monogram").setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(texMonogram).setAlphaMode("MASK").setAlphaCutoff(0.35).setRoughnessFactor(0.50),
  // Shoulder red e-stop mushroom button
  estop: doc.createMaterial("apollo_estop").setBaseColorFactor([0.62, 0.04, 0.04, 1.0]).setRoughnessFactor(0.36).setMetallicFactor(0.10),
  // Backpack top green LED status strip
  greenLed: doc.createMaterial("apollo_green_led").setBaseColorFactor([0.08, 0.72, 0.32, 1.0]).setEmissiveFactor([0.05, 0.55, 0.22]).setRoughnessFactor(0.22),
};

const scene = doc.createScene("ApptronikApollo");
const rootNode = doc.createNode("ApptronikApollo");
scene.addChild(rootNode);

let totalTris = 0;
for (const p of parts) {
  const posAttr = p.geo.getAttribute("position");
  const normAttr = p.geo.getAttribute("normal");
  const uvAttr = p.geo.getAttribute("uv");
  const count = posAttr.count;
  totalTris += count / 3;

  const posAcc = doc.createAccessor(`${p.name}_pos`).setType("VEC3").setArray(new Float32Array(posAttr.array)).setBuffer(buf);
  const normAcc = doc.createAccessor(`${p.name}_norm`).setType("VEC3").setArray(new Float32Array(normAttr.array)).setBuffer(buf);
  const uvAcc = doc.createAccessor(`${p.name}_uv`).setType("VEC2").setArray(new Float32Array(uvAttr.array)).setBuffer(buf);

  const prim = doc.createPrimitive()
    .setMaterial(matMap[p.matKey])
    .setAttribute("POSITION", posAcc)
    .setAttribute("NORMAL", normAcc)
    .setAttribute("TEXCOORD_0", uvAcc);

  const mesh = doc.createMesh(p.name).addPrimitive(prim);
  const node = doc.createNode(p.name).setMesh(mesh);
  rootNode.addChild(node);
}

const io = new NodeIO();
await io.write(outPath, doc);
const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`Built Apptronik Apollo 2 GLB: ${outPath} (${parts.length} parts, ${Math.round(totalTris)} tris, ${kb} KB)`);

#!/usr/bin/env node
/**
 * tools/build_g1_glb.mjs
 * Runner for Unitree G1 GLB conversion and optimization pipeline.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pyScript = path.join(__dirname, "build_g1_glb.py");

console.log("Running Unitree G1 GLB conversion via build_g1_glb.py...");
const res = spawnSync("python", [pyScript], { stdio: "inherit", cwd: path.join(__dirname, "..") });

if (res.status !== 0) {
  console.error("build_g1_glb.py failed with exit code", res.status);
  process.exit(res.status || 1);
} else {
  console.log("build_g1_glb.mjs completed successfully.");
}

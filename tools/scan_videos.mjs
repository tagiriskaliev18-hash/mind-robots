// Scans assets/video/ for Google Flow MP4 clips and updates assets/video/manifest.json availability flags.
import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("assets/video/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const existsNonEmpty = (rel) => {
  try {
    return Boolean(rel) && fs.statSync(path.resolve(rel)).size > 1024;
  } catch {
    return false;
  }
};

if (manifest.master) {
  manifest.master.available = existsNonEmpty(manifest.master.desktop);
  manifest.master.mobileAvailable = existsNonEmpty(manifest.master.mobile);
}

let activeCount = 0;
for (const c of manifest.clips || []) {
  c.available = existsNonEmpty(c.desktop);
  c.mobileAvailable = existsNonEmpty(c.mobile);
  if (c.available) activeCount++;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Updated manifest.json: ${activeCount}/${(manifest.clips || []).length} stage clips available (master=${manifest.master?.available})`);

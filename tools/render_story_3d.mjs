import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 47400;
const OUT_DIR = path.resolve("tools/.cache_3d");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureMode(mode, count) {
  const dir = path.join(OUT_DIR, mode);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const W = mode === "mobile" ? 648 : 1600;
  const H = mode === "mobile" ? 1152 : 900;
  const outW = mode === "mobile" ? 540 : 1280;
  const outH = mode === "mobile" ? 960 : 720;

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${mode} pageerror]`, e.message));

  await page.goto(`http://127.0.0.1:${PORT}/tools/story_3d_scene.html?mode=${mode}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__story3d), { timeout: 25000 });
  const info = await page.evaluate(() => ({ parts: window.__story3d.partCount, w: window.__story3d.width, h: window.__story3d.height }));
  console.log(`[${mode}] scene ready:`, info, `capturing ${count} frames...`);

  const cdp = await ctx.newCDPSession(page);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    await page.evaluate((val) => window.__story3d.renderAt(val), t);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(dir, String(i + 1).padStart(4, "0") + ".png"), Buffer.from(data, "base64"));
    if (i % 60 === 0 || i === count - 1) console.log(`  [${mode}] ${i + 1}/${count} (t=${t.toFixed(3)})`);
  }
  await browser.close();

  const framesOut = path.resolve(`assets/frames/${mode}`);
  fs.mkdirSync(framesOut, { recursive: true });
  for (const f of fs.readdirSync(framesOut)) {
    if (f.endsWith(".webp")) fs.unlinkSync(path.join(framesOut, f));
  }
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-v", "error",
      "-framerate", "30",
      "-i", path.join(dir, "%04d.png"),
      "-vf", `eq=contrast=1.03:saturation=1.04:gamma=0.98,scale=${outW}:${outH}:flags=lanczos`,
      "-c:v", "libwebp", "-quality", "80", "-compression_level", "4", "-preset", "photo",
      path.join(framesOut, "%04d.webp")
    ], { stdio: "inherit" });
    ff.on("exit", (c) => c === 0 ? resolve() : reject(new Error("ffmpeg webp exit " + c)));
  });

  const mp4 = path.join(OUT_DIR, `story3d_${mode}.mp4`);
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-v", "error",
      "-framerate", "30",
      "-i", path.join(dir, "%04d.png"),
      "-vf", `eq=contrast=1.03:saturation=1.04:gamma=0.98,scale=${outW}:${outH}:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
      mp4
    ], { stdio: "inherit" });
    ff.on("exit", (c) => c === 0 ? resolve() : reject(new Error("ffmpeg mp4 exit " + c)));
  });
  console.log(`[${mode}] wrote ${count} WebPs to ${framesOut} + ${mp4}`);
}

await captureMode("desktop", 320);
await captureMode("mobile", 220);

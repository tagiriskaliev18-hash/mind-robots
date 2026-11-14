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

  const W = mode === "mobile" ? 720 : 1920;
  const H = mode === "mobile" ? 1280 : 1080;

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
    if (i % 45 === 0 || i === count - 1) console.log(`  [${mode}] ${i + 1}/${count} (t=${t.toFixed(3)})`);
  }
  await browser.close();

  const mp4 = path.join(OUT_DIR, `story3d_${mode}.mp4`);
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-v", "error",
      "-framerate", "30",
      "-i", path.join(dir, "%04d.png"),
      "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-pix_fmt", "yuv420p",
      mp4
    ], { stdio: "inherit" });
    ff.on("exit", (c) => c === 0 ? resolve() : reject(new Error("ffmpeg exit " + c)));
  });
  console.log(`[${mode}] encoded ${mp4}`);
}

await captureMode("desktop", 210);
await captureMode("mobile", 165);

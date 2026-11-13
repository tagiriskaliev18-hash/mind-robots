// node tools/critic.mjs http://127.0.0.1:47400/   -> critic/*.png + critic/report.json, exit 1 при провале
import { chromium, webkit } from "playwright";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:47400/";
const engines = process.argv.includes("--webkit") ? [["webkit", webkit]] : [["chromium", chromium]];
const soft = process.argv.includes("--swiftshader"); // для машин без GPU: FPS не оценивается, только раскладка
const VIEWS = [
  { name: "desk", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true }
];
fs.mkdirSync("critic", { recursive: true });
const report = { url, at: new Date().toISOString(), fails: [], shots: [] };
const fail = (m) => { report.fails.push(m); console.log("FAIL", m); };

for (const [ename, engine] of engines) {
  let browser;
  if (ename === "chromium" && !soft) {
    browser = await engine.launch({ channel: "chrome" }).catch(() => engine.launch());
  } else {
    browser = await engine.launch({ args: ename === "chromium" && soft ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [] });
  }
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.dpr, isMobile: v.mobile && ename === "chromium", hasTouch: v.mobile });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failed = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    page.on("requestfailed", (r) => failed.push(r.url()));
    page.on("response", (r) => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__mind && window.__mind.mode === "hero", null, { timeout: 90000 });
    await page.waitForTimeout(900);

    const lcp = await page.evaluate(() => new Promise((res) => {
      new PerformanceObserver((l) => { const e = l.getEntries(); res(e.length ? Math.round(e[e.length - 1].startTime) : -1); }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => res(-1), 1500);
    }));
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const ok = (f) => [...document.fonts].some((ff) => ff.family.replace(/"/g, "") === f && ff.status === "loaded");
      // Кириллица реально рисуется Geist, а не fallback: ширина строки должна отличаться от sans-serif.
      const c = document.createElement("canvas").getContext("2d");
      const s = "Сборка робота 0123";
      c.font = "500 40px Geist, monospace"; const a = c.measureText(s).width;
      c.font = "500 40px monospace"; const b = c.measureText(s).width;
      return { geist: ok("Geist"), mono: ok("Geist Mono"), cyrillic: Math.abs(a - b) > 1 };
    });
    if (!fonts.geist || !fonts.mono) fail(`${ename}/${v.name}: шрифт не загружен ${JSON.stringify(fonts)}`);
    if (!fonts.cyrillic) fail(`${ename}/${v.name}: кириллица рисуется fallback-шрифтом`);
    const canvasAlive = await page.evaluate(() => {
      const m = window.__mind;
      const gl = m.stage.renderer.getContext();
      m.stage.render(0.016);
      const w = Math.min(160, gl.drawingBufferWidth), h = Math.min(160, gl.drawingBufferHeight);
      const x = Math.floor((gl.drawingBufferWidth - w) / 2), y = Math.floor((gl.drawingBufferHeight - h) / 2);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let lit = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i] > 28 || px[i + 1] > 28 || px[i + 2] > 28) lit++;
      return lit;
    });
    if (canvasAlive < 50) fail(`${ename}/${v.name}: пустой WebGL-канвас (${canvasAlive} светлых пикселей)`);
    await page.screenshot({ path: `critic/${ename}-${v.name}-hero.png` });
    report.shots.push(`critic/${ename}-${v.name}-hero.png`);

    const n = await page.$$eval("#tabs button", (b) => b.length);
    for (let i = 0; i < n; i++) {
      await page.click(`#tabs button[data-tab="${i}"]`);
      const t0 = Date.now();
      // ждём, пока пружины и камера успокоятся и подписи проявятся (на реальном GPU < 1.5 с)
      await page.waitForFunction(() => window.__mind.err < 0.08 && window.__mind.label > 0.95, null, { timeout: 20000 }).catch(() => {});
      const settleMs = Date.now() - t0;
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
        const calls = [...document.querySelectorAll(".call")].filter((e) => !e.hidden && Number(getComputedStyle(e).opacity) > 0.5).map(r);
        const tabs = r(document.getElementById("tabs"));
        const hit = (a, b) => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
        const overlaps = [];
        calls.forEach((a, i) => calls.forEach((b, j) => { if (j > i && hit(a, b)) overlaps.push([i, j]); }));
        // доля площади карточки, лежащая на bbox деталей (bbox грубее силуэта => порог 25%)
        const rects = window.__mind.partRects();
        const onObject = calls.map((c) => {
          const area = c.w * c.h;
          let worst = 0;
          for (const p of rects) {
            const ix = Math.max(0, Math.min(c.r, p.r) - Math.max(c.x, p.x));
            const iy = Math.max(0, Math.min(c.b, p.b) - Math.max(c.y, p.y));
            worst = Math.max(worst, (ix * iy) / area);
          }
          return Number(worst.toFixed(2));
        });
        const offscreen = calls.filter((c) => c.x < 0 || c.y < 0 || c.r > innerWidth || c.b > innerHeight).length;
        const underTabs = calls.filter((c) => hit(c, tabs)).length;
        return { onObject, fps: window.__mind.fps, titleOverCalls: window.__mind.titleVisible && calls.length > 0, err: window.__mind.err, calls: calls.length, overlaps, offscreen, underTabs, titleVisible: window.__mind.titleVisible };
      });
      const shot = `critic/${ename}-${v.name}-tab${i + 1}.png`;
      await page.screenshot({ path: shot });
      report.shots.push(shot);
      if (m.calls === 0) fail(`${ename}/${v.name} tab${i + 1}: нет видимых callout'ов`);
      if (m.overlaps.length) fail(`${ename}/${v.name} tab${i + 1}: callout'ы перекрываются ${JSON.stringify(m.overlaps)}`);
      if (m.onObject.some((f) => f > 0.25)) fail(`${ename}/${v.name} tab${i + 1}: callout лежит на объекте ${JSON.stringify(m.onObject)}`);
      if (m.offscreen) fail(`${ename}/${v.name} tab${i + 1}: callout за краем экрана`);
      if (m.underTabs) fail(`${ename}/${v.name} tab${i + 1}: callout под табами`);
      m.settleMs = settleMs;
      if (m.err > 0.08) fail(`${ename}/${v.name} tab${i + 1}: сцена не успокоилась (err ${m.err.toFixed(3)})`);
      if (!soft && settleMs > 1600) fail(`${ename}/${v.name} tab${i + 1}: переход ${settleMs} мс > 1600`);
      if (!soft && m.fps < (v.mobile ? 50 : 55)) fail(`${ename}/${v.name} tab${i + 1}: FPS ${m.fps}`);
      if (m.titleOverCalls) fail(`${ename}/${v.name} tab${i + 1}: заголовок сцены виден одновременно с подписями`);
      report[`${ename}-${v.name}-tab${i + 1}`] = m;
    }
    report[`${ename}-${v.name}`] = { lcp, fonts, consoleErrors, failed };
    if (consoleErrors.length) fail(`${ename}/${v.name}: console errors ${JSON.stringify(consoleErrors.slice(0, 5))}`);
    if (failed.length) fail(`${ename}/${v.name}: битые запросы ${JSON.stringify(failed.slice(0, 5))}`);
    if (!soft && lcp > 2500) fail(`${ename}/${v.name}: LCP ${lcp} мс > 2500`);
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync("critic/report.json", JSON.stringify(report, null, 2));
console.log(report.fails.length ? `\n${report.fails.length} провалов — чинить и прогнать снова` : "\nPASS: все автоматические проверки пройдены — теперь визуальный чек-лист");
process.exit(report.fails.length ? 1 : 0);

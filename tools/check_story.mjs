// Node equivalent of tools/check.py using the local Playwright installation (Chromium + WebKit).
// Verifies Act I Build-Story on 1440x900 and 390x844 (iPhone): 0 console/404 errors, all 7 stages + dots + copyBoxes,
// tracked callout inside viewport, finale opacity > 0.9, jump velocity clamp <= 260*1.15 fr/s, and LCP <= 2500 ms.
import { chromium, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] || "http://127.0.0.1:47400/";
const outDir = "tools/shots";
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: "1440", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  {
    name: "390",
    opts: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    }
  }
];

async function settle(page, timeoutMs = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await page.evaluate(() => window.__story.state());
    if (Math.abs(s.target - s.current) < 1e-3) return s;
    await page.waitForTimeout(90);
  }
  return page.evaluate(() => window.__story.state());
}

const allResults = [];

for (const [ename, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = ename === "chromium"
    ? await engine.launch({ channel: "chrome" }).catch(() => engine.launch())
    : await engine.launch();

  for (const vp of VIEWPORTS) {
    const opts = { ...vp.opts };
    if (ename === "webkit") delete opts.isMobile;
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    const failed = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("requestfailed", (r) => failed.push(r.url()));
    page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

    const t0 = Date.now();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__story && window.__story.state().ready, null, { timeout: 45000 });
    const ready_s = Number(((Date.now() - t0) / 1000).toFixed(2));

    const lcp = await page.evaluate(() => new Promise((r) => {
      let v = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => r(Math.round(v)), 300);
    }));

    const n = await page.$$eval(".dot", (d) => d.length);
    const rep = { engine: ename, viewport: vp.name, ready_s, lcp_ms: lcp, stages: [] };

    for (let i = 0; i < n; i++) {
      await page.evaluate((idx) => window.__story.goTo(idx), i);
      await page.waitForTimeout(1850);
      const s = await settle(page);
      await page.waitForTimeout(220);
      const info = await page.evaluate(() => {
        const items = [...document.querySelectorAll(".copy__item")];
        const vis = items.map((e) => +getComputedStyle(e).opacity);
        const dot = [...document.querySelectorAll(".dot")].findIndex((d) => d.classList.contains("is-active"));
        const shown = vis.findIndex((v) => v > 0.9);
        const el = items[shown];
        const r = el ? el.getBoundingClientRect() : null;
        return {
          vis,
          dot,
          shown,
          hint: document.querySelector("#hintNext")?.textContent || "",
          copyBox: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null,
          overflowX: document.documentElement.scrollWidth > innerWidth
        };
      });
      const shot = path.join(outDir, `${ename}-${vp.name}-stage${i + 1}.png`);
      await page.screenshot({ path: shot });
      const ok = info.dot === i && info.shown === i && !info.overflowX;
      rep.stages.push({
        i: i + 1,
        frame: s.frame,
        active: s.active,
        dot: info.dot,
        shown: info.shown,
        hint: info.hint,
        copyBox: info.copyBox,
        ok,
        shot: path.basename(shot)
      });
    }

    // Callout check at progress 0.07
    await page.evaluate(() => window.__story.progressTo(0.07));
    await page.waitForTimeout(300);
    await settle(page);
    await page.waitForTimeout(200);
    const co = await page.evaluate(() => {
      const e = document.querySelector(".callout");
      if (!e) return null;
      const p = e.querySelector(".callout__pin").getBoundingClientRect();
      const b = e.getBoundingClientRect();
      return {
        o: +getComputedStyle(e).opacity,
        x: Math.round(p.left + p.width / 2),
        y: Math.round(p.top + p.height / 2),
        right: Math.round(b.right),
        w: innerWidth,
        h: innerHeight
      };
    });
    await page.screenshot({ path: path.join(outDir, `${ename}-${vp.name}-callout.png`) });
    rep.callout = co;
    const co_ok = !co || (co.o > 0.9 && co.x > 0 && co.x < co.w && co.y > 0 && co.y < co.h && co.right <= co.w);

    // Finale check
    await page.evaluate(() => window.__story.progressTo(0.995));
    await page.waitForTimeout(300);
    await settle(page);
    await page.waitForTimeout(250);
    const fo = await page.evaluate(() => +getComputedStyle(document.querySelector("#finale")).opacity);
    await page.screenshot({ path: path.join(outDir, `${ename}-${vp.name}-finale.png`) });
    rep.finale_opacity = fo;

    // Velocity clamp jump test: 0.1 -> 0.8
    await page.evaluate(() => window.__story.progressTo(0.1));
    await settle(page);
    await page.evaluate(() => { window.__story.resetStats(); window.__story.progressTo(0.8); });
    await page.waitForTimeout(2400);
    const jumps = await page.evaluate(() => window.__story.stats());
    jumps.maxFramesPerSec = jumps.maxSpeed;
    rep.jump_test = jumps;

    rep.console_errors = errors;
    rep.failed_requests = failed;
    rep.pass = (
      co_ok &&
      errors.length === 0 &&
      failed.length === 0 &&
      rep.stages.every((s) => s.ok) &&
      fo > 0.9 &&
      jumps.maxFramesPerSec <= 260 * 1.15 &&
      lcp <= 2500
    );
    allResults.push(rep);
    await ctx.close();
  }
  await browser.close();
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(allResults, null, 2));
for (const r of allResults) {
  console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.engine} ${r.viewport}: ready ${r.ready_s}s, LCP ${r.lcp_ms}ms, finale ${r.finale_opacity.toFixed(2)}, callout ${JSON.stringify(r.callout)}, maxSpeed ${r.jump_test.maxFramesPerSec.toFixed(0)} fr/s, errors ${r.console_errors.length}, failed ${r.failed_requests.length}`);
  for (const s of r.stages) {
    console.log(`   stage ${s.i}: frame ${s.frame} dot ${s.dot} copy ${s.shown} box ${JSON.stringify(s.copyBox)} hint '${s.hint}' ${s.ok ? "ok" : "BAD"}`);
  }
  for (const e of [...r.console_errors, ...r.failed_requests]) console.log("   !", e);
}
process.exit(allResults.every((r) => r.pass) ? 0 : 1);

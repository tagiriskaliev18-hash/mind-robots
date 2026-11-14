#!/usr/bin/env python3
"""Quality gate for a build-story scroll site (Playwright).
Usage: python3 tools/check.py [--url http://127.0.0.1:8080/] [--out shots] [--engines chromium,webkit]
Without --url it serves the starter folder itself on a free port.
Checks per viewport (1440x900 desktop, 390x844 iPhone): no console errors / failed requests,
every stage shows its own copy + active dot, finale card appears, no film jump > velocity clamp,
LCP. Writes a screenshot for every stage and report.json."""
import argparse, json, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

VIEWPORTS = [
    ('1440', dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)),
    ('390', dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True,
                 user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')),
]

LCP_JS = """new Promise(r=>{let v=0;new PerformanceObserver(l=>{for(const e of l.getEntries())v=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});setTimeout(()=>r(v),300)})"""

def settle(page, timeout=6.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = page.evaluate('window.__story.state()')
        if abs(s['target'] - s['current']) < 1e-3: return s
        page.wait_for_timeout(100)
    return page.evaluate('window.__story.state()')

def run(engine, url, out):
    results = []
    with sync_playwright() as p:
        browser = getattr(p, engine).launch()
        for name, opts in VIEWPORTS:
            if engine == 'webkit': opts = {k: v for k, v in opts.items()}
            ctx = browser.new_context(**opts); page = ctx.new_page()
            errors, failed = [], []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('requestfailed', lambda r: failed.append(r.url))
            page.on('response', lambda r: failed.append(f'{r.status} {r.url}') if r.status >= 400 else None)
            t0 = time.time(); page.goto(url, wait_until='load')
            page.wait_for_function('window.__story && window.__story.state().ready', timeout=30000)
            ready_s = round(time.time() - t0, 2)
            lcp = page.evaluate(LCP_JS)
            stages = page.evaluate('window.__STORY_STAGES || null')
            n = page.evaluate("document.querySelectorAll('.dot').length")
            rep = {'engine': engine, 'viewport': name, 'ready_s': ready_s, 'lcp_ms': round(lcp), 'stages': []}
            for i in range(n):
                page.evaluate(f'window.__story.goTo({i})'); page.wait_for_timeout(1900); s = settle(page)
                page.wait_for_timeout(250)
                info = page.evaluate("""()=>{const items=[...document.querySelectorAll('.copy__item')];
                  const vis=items.map(e=>+getComputedStyle(e).opacity);
                  const dot=[...document.querySelectorAll('.dot')].findIndex(d=>d.classList.contains('is-active'));
                  const shown=vis.findIndex(v=>v>0.9);
                  const el=items[shown]; const r=el?el.getBoundingClientRect():null;
                  return {vis, dot, shown, hint: document.querySelector('#hintNext').textContent,
                          copyBox: r?[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]:null,
                          overflowX: document.documentElement.scrollWidth>innerWidth}}""")
                shot = os.path.join(out, f'{engine}-{name}-stage{i + 1}.png'); page.screenshot(path=shot)
                ok = info['dot'] == i and info['shown'] == i and not info['overflowX']
                rep['stages'].append({'i': i + 1, 'frame': s['frame'], 'active': s['active'], 'dot': info['dot'], 'shown': info['shown'],
                                      'hint': info['hint'], 'copyBox': info['copyBox'], 'ok': ok, 'shot': os.path.basename(shot)})
            # callout tracking: first callout visible mid-window and inside the viewport
            page.evaluate('window.__story.progressTo(0.08)'); page.wait_for_timeout(300); settle(page); page.wait_for_timeout(200)
            co = page.evaluate("""()=>{const e=document.querySelector('.callout'); if(!e) return null; const p=e.querySelector('.callout__pin').getBoundingClientRect();
                return {o:+getComputedStyle(e).opacity, x:Math.round(p.left+p.width/2), y:Math.round(p.top+p.height/2), w:innerWidth, h:innerHeight}}""")
            page.screenshot(path=os.path.join(out, f'{engine}-{name}-callout.png'))
            rep['callout'] = co
            co_ok = co is None or (co['o'] > 0.9 and 0 < co['x'] < co['w'] and 0 < co['y'] < co['h'])
            # finale
            page.evaluate('window.__story.progressTo(0.995)'); page.wait_for_timeout(300); settle(page); page.wait_for_timeout(300)
            fo = page.evaluate("+getComputedStyle(document.querySelector('#finale')).opacity")
            page.screenshot(path=os.path.join(out, f'{engine}-{name}-finale.png'))
            rep['finale_opacity'] = fo
            # jump test: teleport scroll 0.1 -> 0.8 and sample film frame each rAF
            page.evaluate('window.__story.progressTo(0.1)'); settle(page)
            page.evaluate('window.__story.resetStats(); window.__story.progressTo(0.8)'); page.wait_for_timeout(2500)
            jumps = page.evaluate('window.__story.stats()'); jumps['maxFramesPerSec'] = jumps['maxSpeed']
            rep['jump_test'] = jumps
            rep['console_errors'] = errors; rep['failed_requests'] = failed
            rep['pass'] = (co_ok and not errors and not failed and all(s['ok'] for s in rep['stages']) and fo > 0.9
                           and jumps['maxFramesPerSec'] <= 260 * 1.15)
            results.append(rep); ctx.close()
        browser.close()
    return results

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--url'); ap.add_argument('--out', default=os.path.join(HERE, 'shots'))
    ap.add_argument('--engines', default='chromium'); a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True); srv = None; url = a.url
    if not url:
        port = free_port(); srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=SITE,
                                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        url = f'http://127.0.0.1:{port}/'; time.sleep(0.8)
    try:
        allr = []
        for e in a.engines.split(','): allr += run(e.strip(), url, a.out)
    finally:
        if srv: srv.terminate()
    json.dump(allr, open(os.path.join(a.out, 'report.json'), 'w'), indent=2)
    for r in allr:
        print(f"[{'PASS' if r['pass'] else 'FAIL'}] {r['engine']} {r['viewport']}: ready {r['ready_s']}s, LCP {r['lcp_ms']}ms, "
              f"finale {r['finale_opacity']:.2f}, callout {r['callout']}, max film speed {r['jump_test']['maxFramesPerSec']:.0f} fr/s (clamp 260), errors {len(r['console_errors'])}, failed {len(r['failed_requests'])}")
        for s in r['stages']: print(f"   stage {s['i']}: frame {s['frame']} dot {s['dot']} copy {s['shown']} hint '{s['hint']}' {'ok' if s['ok'] else 'BAD'}")
        for e in r['console_errors'] + r['failed_requests']: print('   !', e)
    sys.exit(0 if all(r['pass'] for r in allr) else 1)

/* ============================================================================
   Neural field — lightweight canvas 2d
   Drifting nodes, proximity edges, pulses travelling along the strongest links.
   Pauses when offscreen or when the tab is hidden. Static render under
   prefers-reduced-motion. Exposes window.MindNeural for scroll-driven energy.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* One field per canvas. The stage drives its own energy from scroll; any other
     canvas just idles at a low, constant energy. */
  function mount(cv, baseEnergy) {
  if (!cv || !cv.getContext) return null;

  var ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return null;

  var W = 0, H = 0, DPR = 1;
  var nodes = [], edges = [], pulses = [];
  var raf = 0, visible = false, last = 0;
  var energy = 0;        // 0..1 — driven by scroll progress of the pinned section
  var energyTarget = 0;

  var LINK = 150;        // px, link radius (css px)
  var MAX_NODES = 64;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var rect = cv.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);

    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // density scales with area, hard-capped for cheap frames on phones
    var n = Math.round(Math.min(MAX_NODES, Math.max(16, (W * H) / 20000)));
    nodes = [];
    for (var i = 0; i < n; i++) {
      nodes.push({
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-0.11, 0.11),
        vy: rand(-0.11, 0.11),
        r: rand(1.1, 2.4),
        hue: Math.random() < 0.34 ? 1 : 0, // 1 = cyan accent node
        ph: rand(0, Math.PI * 2)
      });
    }
    pulses = [];
  }

  function step(dt) {
    var i, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < -40) n.x = W + 40; else if (n.x > W + 40) n.x = -40;
      if (n.y < -40) n.y = H + 40; else if (n.y > H + 40) n.y = -40;
      n.ph += dt * 0.0016;
    }

    // rebuild edges (O(n²) on ≤64 nodes ≈ 2k cheap checks)
    edges.length = 0;
    var lim = LINK * LINK;
    for (i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < lim) edges.push([a, b, 1 - d2 / lim]);
      }
    }

    // spawn pulses, more of them as the section's energy rises
    var want = 2 + Math.round(energy * 7);
    if (edges.length && pulses.length < want && Math.random() < 0.05 + energy * 0.09) {
      var e = edges[(Math.random() * edges.length) | 0];
      if (e[2] > 0.42) pulses.push({ a: e[0], b: e[1], t: 0, sp: rand(0.0006, 0.0013) });
    }
    for (i = pulses.length - 1; i >= 0; i--) {
      pulses[i].t += pulses[i].sp * dt;
      if (pulses[i].t >= 1) pulses.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // edges
    ctx.lineWidth = 1;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i], a = e[0], b = e[1], s = e[2];
      var alpha = s * s * (0.17 + energy * 0.22);
      if (alpha < 0.012) continue;
      ctx.strokeStyle = (a.hue || b.hue)
        ? 'rgba(0,245,255,' + alpha.toFixed(3) + ')'
        : 'rgba(123,110,255,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodes
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var puls = 0.6 + 0.4 * Math.sin(n.ph);
      var r = n.r * (0.9 + energy * 0.35);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.hue
        ? 'rgba(0,245,255,' + (0.3 + puls * 0.4).toFixed(3) + ')'
        : 'rgba(150,135,255,' + (0.2 + puls * 0.28).toFixed(3) + ')';
      ctx.fill();
    }

    // pulses
    for (i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var t = p.t;
      var x = p.a.x + (p.b.x - p.a.x) * t;
      var y = p.a.y + (p.b.y - p.a.y) * t;
      var fade = Math.sin(t * Math.PI);
      ctx.beginPath();
      ctx.arc(x, y, 1.9 + fade * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,245,255,' + (0.5 * fade + 0.2).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(48, now - (last || now));
    last = now;
    energy += (energyTarget - energy) * 0.07;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || raf || !visible) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  var ro = window.ResizeObserver ? new ResizeObserver(function () {
    build();
    if (reduced) { step(16); draw(); }
  }) : null;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: '120px' }).observe(cv);
  } else {
    visible = true;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  build();
  if (ro) ro.observe(cv);
  else window.addEventListener('resize', function () { build(); }, { passive: true });

  energy = energyTarget = baseEnergy || 0;
  if (reduced) { step(16); draw(); } else start();

  return { setEnergy: function (v) { energyTarget = Math.max(0, Math.min(1, v)); } };
  }

  var stage = mount(document.getElementById('neural'), 0.22);
  mount(document.getElementById('neuralCta'), 0.42);

  window.MindNeural = {
    setEnergy: function (v) { if (stage) stage.setEnergy(v); }
  };
})();

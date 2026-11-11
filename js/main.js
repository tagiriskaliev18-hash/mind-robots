/* ============================================================================
   MIND Robotics — motion layer
   Lenis + GSAP/ScrollTrigger. Everything degrades: no JS → full static page,
   prefers-reduced-motion → final states, no pin, no cursor.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var hasGsap = typeof window.gsap !== 'undefined';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- always-on UI (works without GSAP) ---------- */

  /* FAQ */
  $$('.qa').forEach(function (qa) {
    var btn = $('.qa__q', qa);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = qa.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* Mobile sheet */
  var burger = $('#burger'), sheet = $('#sheet');
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }
  if (burger && sheet) {
    burger.addEventListener('click', function () {
      var open = !sheet.classList.contains('is-open');
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('is-locked', open);
    });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', closeSheet); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('is-open')) { closeSheet(); burger.focus(); }
    });
  }

  /* ---------- reduced motion / no GSAP: reveal everything, stop ---------- */
  function revealAll() {
    $$('.r-up,.r-fade,.r-clip').forEach(function (el) {
      el.style.opacity = '1'; el.style.transform = 'none'; el.style.clipPath = 'none';
    });
    var pre = $('#pre');
    if (pre) pre.remove();
    document.body.classList.add('is-ready');
  }

  if (!hasGsap || reduced) {
    revealAll();
    if (window.MindNeural) window.MindNeural.setEnergy(0.35);
    // anchors still need smooth-ish behaviour but respect reduced motion
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  var ST = window.ScrollTrigger;

  /* ---------- Lenis ---------- */
  var lenis = null;
  var LenisCtor = window.Lenis || (window.lenis && window.lenis.default);
  if (LenisCtor) {
    doc.classList.add('lenis');
    lenis = new LenisCtor({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -72, duration: 1.2 });
    else {
      var el = typeof target === 'string' ? $(target) : target;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 72, behavior: 'smooth' });
    }
  }
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (!id || id === '#' || !$(id)) return;
    a.addEventListener('click', function (e) { e.preventDefault(); closeSheet(); goTo(id); });
  });

  /* ---------- split text: lines of words, masked ---------- */
  function split(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var wrap = document.createElement('span');
      wrap.className = 'w';
      wrap.style.display = 'inline-block';
      wrap.style.overflow = 'hidden';
      wrap.style.verticalAlign = 'top';
      var inner = document.createElement('span');
      inner.className = 'w-i';
      inner.style.display = 'inline-block';
      inner.style.willChange = 'transform';
      inner.textContent = w + (i < words.length - 1 ? ' ' : '');
      wrap.appendChild(inner);
      frag.appendChild(wrap);
    });
    el.appendChild(frag);
    return $$('.w-i', el);
  }

  var heroWords = null;
  $$('[data-split]').forEach(function (el) {
    var parts = split(el);
    gsap.set(parts, { yPercent: 112 });
    if (el.closest('#hero')) { heroWords = parts; return; }  // hero runs on its own timeline
    gsap.to(parts, {
      yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- generic reveals (batched so siblings stagger together) ---------- */
  ST.batch('.r-up', {
    start: 'top 90%',
    once: true,
    onEnter: function (els) {
      gsap.to(els, { opacity: 1, y: 0, duration: 1.05, ease: 'expo.out', stagger: 0.07, overwrite: true });
    }
  });
  ST.batch('.r-fade', {
    start: 'top 94%',
    once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, duration: 1.2, ease: 'power2.out', stagger: 0.06 }); }
  });

  /* ---------- preloader → hero ---------- */
  var pre = $('#pre'), preBar = $('#preBar');
  var heroTl = gsap.timeline({ paused: true });
  var heroImg = $('#heroImg');

  if (heroImg) gsap.set(heroImg, { scale: 1.16, filter: 'blur(14px)' });
  gsap.set('.hero__kpi, .hero__side', { opacity: 0, y: 24 });

  heroTl
    .to(heroImg, { scale: 1, filter: 'blur(0px)', duration: 1.9, ease: 'expo.out' }, 0)
    .to(heroWords, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.05 }, 0.18)
    .to('.hero__side', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.55)
    .to('.hero__kpi', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.72);

  function launch() {
    document.body.classList.add('is-ready');
    heroTl.play();
    ST.refresh();
  }

  if (pre) {
    var tl = gsap.timeline();
    tl.to(preBar, { width: '100%', duration: 0.9, ease: 'power2.inOut' })
      .to('.pre__mark', { scale: 0.86, opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.1')
      .to(pre, {
        yPercent: -100, duration: 0.9, ease: 'expo.inOut',
        onComplete: function () { pre.remove(); }
      }, '-=0.15')
      .add(launch, '-=0.6');
  } else {
    launch();
  }

  /* ---------- hero parallax ---------- */
  if (heroImg) {
    gsap.to(heroImg, {
      yPercent: 13, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__in', {
      yPercent: -14, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- panel image parallax ---------- */
  $$('.panel__media img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: img.closest('.panel'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  var mImg = $('#modelsImg');
  if (mImg) {
    gsap.fromTo(mImg, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '#models', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var o = { v: 0 };
    ST.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(o, {
          v: end, duration: 1.9, ease: 'expo.out',
          onUpdate: function () {
            el.textContent = o.v.toFixed(dec).replace('.', ',');
          }
        });
      }
    });
  });

  /* ---------- marquee ---------- */
  var mq = $('#marquee');
  if (mq) {
    mq.innerHTML += mq.innerHTML;                   // duplicate for a seamless loop
    gsap.to(mq, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });
  }

  /* ---------- nav state ---------- */
  var nav = $('#nav'), lastY = 0;
  ST.create({
    start: 'top -80',
    onUpdate: function (self) {
      nav.classList.toggle('is-stuck', self.scroll() > 80);
      var y = self.scroll();
      if (!sheet.classList.contains('is-open')) {
        nav.classList.toggle('is-hidden', y > lastY && y > 400);
      }
      lastY = y;
    }
  });
  gsap.to('.progress', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
  });

  var navLinks = $$('#navLinks a');
  navLinks.forEach(function (a) {
    var sec = $(a.getAttribute('href'));
    if (!sec) return;
    ST.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: function (self) {
        if (self.isActive) {
          navLinks.forEach(function (x) { x.classList.remove('is-active'); });
          a.classList.add('is-active');
        }
      }
    });
  });

  /* ---------- Sense → Think → Act: pinned, image-led stage ---------- */
  var steps = $$('.stage__step');
  var railBtns = $$('#loopRail button');
  var railFills = railBtns.map(function (b) { return $('.stage__rail-t i', b); });

  function setPhase(i, local) {
    railBtns.forEach(function (b, k) {
      var on = k === i;
      b.classList.toggle('is-on', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      var f = railFills[k];
      if (f) f.style.transform = 'scaleY(' + (k < i ? 1 : k > i ? 0 : local) + ')';
    });
    steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
  }

  var mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', function () {
    if (!steps.length) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#stage',
        start: 'top top',
        end: '+=300%',
        pin: '#stagePin',
        pinSpacing: true,
        scrub: 0.5,
        anticipatePin: 1,
        onUpdate: function (self) {
          var p = self.progress * steps.length;
          var idx = Math.min(steps.length - 1, Math.max(0, Math.floor(p)));
          setPhase(idx, Math.min(1, Math.max(0, p - idx)));
          if (window.MindNeural) window.MindNeural.setEnergy(0.3 + self.progress * 0.7);
        },
        onLeave: function () { if (window.MindNeural) window.MindNeural.setEnergy(0.32); },
        onLeaveBack: function () { if (window.MindNeural) window.MindNeural.setEnergy(0.22); }
      }
    });

    var HIDDEN = 'inset(22% 0% 22% 0%)';
    var SHOWN = 'inset(0% 0% 0% 0%)';

    steps.forEach(function (st, i) {
      var frame = $('.stage__frame', st);
      var img = $('img', st);
      var cap = $('.stage__cap', st);

      gsap.set(st, { opacity: i ? 0 : 1 });
      gsap.set(frame, { clipPath: i ? HIDDEN : SHOWN });
      gsap.set(cap, { opacity: i ? 0 : 1, y: i ? 46 : 0 });

      /* slow push-in while this step holds the screen */
      tl.fromTo(img, { scale: 1.04, yPercent: -2.5 },
        { scale: 1.14, yPercent: 2.5, ease: 'none', duration: 1 }, i);

      if (i > 0) {
        tl.to(st, { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, i - 0.22)
          .to(frame, { clipPath: SHOWN, duration: 0.58, ease: 'power3.out' }, i - 0.22)
          .to(cap, { opacity: 1, y: 0, duration: 0.52, ease: 'expo.out' }, i - 0.08);
      }
      if (i < steps.length - 1) {
        tl.to(cap, { opacity: 0, y: -36, duration: 0.34, ease: 'power2.in' }, i + 0.6)
          .to(frame, { clipPath: HIDDEN, duration: 0.46, ease: 'power2.inOut' }, i + 0.7)
          .to(st, { opacity: 0, duration: 0.3, ease: 'power1.inOut' }, i + 0.84);
      }
    });

    tl.to({}, { duration: 0.16 });

    function jump(i) {
      var st = tl.scrollTrigger;
      if (!st) return;
      var frac = (i + 0.3) / steps.length;
      var y = st.start + (st.end - st.start) * frac;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    var offs = railBtns.map(function (b, i) {
      var h = function () { jump(i); };
      b.addEventListener('click', h);
      return function () { b.removeEventListener('click', h); };
    });

    return function () {
      offs.forEach(function (f) { f(); });
      steps.forEach(function (st) {
        gsap.set([st, $('.stage__frame', st), $('img', st), $('.stage__cap', st)], { clearProps: 'all' });
      });
      railFills.forEach(function (f) { if (f) f.style.transform = ''; });
    };
  });

  mm.add('(max-width: 767px)', function () {
    /* phones: no pin — full-bleed image panels read as a stacked sequence */
    var tws = [];
    steps.forEach(function (st, i) {
      var frame = $('.stage__frame', st);
      var img = $('img', st);
      var cap = $('.stage__cap', st);
      tws.push(gsap.fromTo(frame, { clipPath: 'inset(12% 0% 12% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: st, start: 'top 86%', once: true }
      }));
      tws.push(gsap.fromTo(cap, { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.95, ease: 'expo.out',
        scrollTrigger: { trigger: cap, start: 'top 94%', once: true }
      }));
      tws.push(gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: st, start: 'top bottom', end: 'bottom top', scrub: true }
      }));
    });
    var en = ST.create({
      trigger: '#stage', start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: function (self) {
        if (window.MindNeural) window.MindNeural.setEnergy(0.2 + self.progress * 0.6);
      }
    });
    return function () {
      tws.forEach(function (t) { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
      en.kill();
    };
  });

  /* ---------- ladder progress ---------- */
  var ladder = $('#ladder'), fill = $('#ladderFill'), rungs = $$('.rung');
  if (ladder && fill) {
    ST.create({
      trigger: ladder, start: 'top 72%', end: 'bottom 72%', scrub: 0.4,
      onUpdate: function (self) {
        fill.style.height = (self.progress * 100) + '%';
      }
    });
    rungs.forEach(function (r) {
      ST.create({
        trigger: r, start: 'top 72%', end: 'bottom 60%',
        onToggle: function (self) { r.classList.toggle('is-on', self.isActive); }
      });
    });
  }

  /* ---------- magnetic buttons + custom cursor ---------- */
  var fine = window.matchMedia('(pointer: fine)').matches;

  if (fine) {
    var cur = $('#cursor'), dot = $('#cursorDot');
    var cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    var cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.09, ease: 'power2' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.09, ease: 'power2' });

    window.addEventListener('mousemove', function (e) {
      cx(e.clientX); cy(e.clientY); dx(e.clientX); dy(e.clientY);
      if (!cur.classList.contains('is-on')) { cur.classList.add('is-on'); dot.classList.add('is-on'); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      cur.classList.remove('is-on'); dot.classList.remove('is-on');
    });

    $$('a, button, .qa__q, .mrow').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('is-hot'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('is-hot'); });
    });

    $$('[data-magnetic]').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1,0.45)' });
      var my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1,0.45)' });
      var t = $('.btn__t', el);
      var tx = t ? gsap.quickTo(t, 'x', { duration: 0.6, ease: 'power3' }) : null;
      var ty = t ? gsap.quickTo(t, 'y', { duration: 0.6, ease: 'power3' }) : null;

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var relX = e.clientX - r.left - r.width / 2;
        var relY = e.clientY - r.top - r.height / 2;
        mx(relX * 0.28); my(relY * 0.42);
        if (tx) { tx(relX * 0.1); ty(relY * 0.16); }
      });
      el.addEventListener('mouseleave', function () {
        mx(0); my(0);
        if (tx) { tx(0); ty(0); }
      });
    });
  }

  /* ---------- housekeeping ----------
     Reveals use once:true, so anything the viewport *jumped* past (scroll
     restoration on reload, a deep link, an in-page jump) never crosses its
     trigger and would stay invisible. Catch those up on every refresh. */
  function catchUpReveals() {
    $$('.r-up,.r-fade,.r-clip').forEach(function (el) {
      if (el.getBoundingClientRect().bottom < 0 && gsap.getProperty(el, 'opacity') < 1) {
        gsap.set(el, { opacity: 1, y: 0, clipPath: 'none' });
      }
    });
    $$('[data-split]').forEach(function (el) {
      if (el.closest('#hero')) return;
      if (el.getBoundingClientRect().bottom < 0) {
        var parts = $$('.w-i', el);
        if (parts.length && gsap.getProperty(parts[0], 'yPercent') !== 0) {
          gsap.set(parts, { yPercent: 0 });
        }
      }
    });
  }
  ST.addEventListener('refresh', catchUpReveals);

  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();

/* Round-1 finish: on phones collapse long detail blocks so images + display type dominate */
(function () {
  var mq = window.matchMedia('(max-width: 767px)');
  function apply() {
    document.querySelectorAll('details.facts__more, details.xmore').forEach(function (d) {
      if (mq.matches) d.removeAttribute('open'); else if (d.classList.contains('facts__more') || d.closest('.chain')) d.setAttribute('open', '');
    });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply);
  document.addEventListener('toggle', function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, true);
})();

/* =========================================================
   MIND / Современные роботы — motion layer
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(function () {
  'use strict';

  var hasGSAP = typeof window.gsap !== 'undefined';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- 0. Fallback: no GSAP → show everything ---------- */
  if (!hasGSAP) {
    body.classList.remove('is-loading');
    var pl = $('#preload'); if (pl) pl.remove();
    $$('.reveal').forEach(function (el) { el.style.opacity = 1; });
    initFaqFallback();
    initNavBasics();
    return;
  }

  /* ---------- 1. Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    var offset = -64;
    if (lenis) lenis.scrollTo(target, { offset: offset, duration: 1.2 });
    else {
      var y = target.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* ---------- 2. Nav ---------- */
  function initNavBasics() {
    var nav = $('#nav');
    var burger = $('#burger');
    var links = $('#navLinks');

    if (burger) {
      burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (nav) nav.classList.remove('is-open');
        if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
        scrollToTarget(target);
      });
    });

    window.addEventListener('scroll', function () {
      if (nav) nav.classList.toggle('is-stuck', window.pageYOffset > 24);
    }, { passive: true });
  }
  initNavBasics();

  /* active link */
  $$('#navLinks a').forEach(function (a) {
    var id = a.getAttribute('href');
    var sec = id && document.querySelector(id);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: function (self) { a.classList.toggle('is-active', self.isActive); }
    });
  });

  /* ---------- 3. Scroll progress ---------- */
  var progress = $('#progress');
  if (progress) {
    gsap.to(progress, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }

  /* ---------- 4. Split headings into words ---------- */
  function splitWords(el) {
    if (el.dataset.split === 'done') return [];
    var words = [];
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part.trim()) { if (part.length) el.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'rword'; s.textContent = part;
          el.appendChild(s); words.push(s);
        });
      } else if (node.nodeType === 1) {
        /* класс (например .grad-text) вешаем на каждое слово:
           background-clip:text не переживает трансформации вложенных узлов */
        var cls = ('rword ' + (node.className || '')).trim();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part.trim()) { if (part.length) el.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = cls; s.textContent = part;
          el.appendChild(s); words.push(s);
        });
      }
    });
    el.dataset.split = 'done';
    return words;
  }

  var heroWords = [];
  $$('[data-split]').forEach(function (h) {
    var words = splitWords(h);
    if (!words.length) return;
    var isHero = h.classList.contains('hero__title');
    if (reduce) return;
    gsap.set(words, { yPercent: 115, opacity: 0 });
    if (isHero) { heroWords = words; return; }
    gsap.to(words, {
      yPercent: 0, opacity: 1, duration: 1.05, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: h, start: 'top 86%' }
    });
  });

  /* ---------- 5. Generic reveals ---------- */
  var variants = {
    up: { y: 46, opacity: 0 },
    fade: { opacity: 0 },
    right: { x: 44, opacity: 0 },
    scale: { scale: 0.95, y: 32, opacity: 0, transformOrigin: '50% 60%' }
  };
  $$('.reveal').forEach(function (el) {
    var v = variants[el.dataset.reveal || 'up'] || variants.up;
    var delay = parseFloat(el.dataset.delay || 0);
    if (reduce) { gsap.set(el, { opacity: 1, clearProps: 'transform' }); return; }
    gsap.set(el, v);
    gsap.to(el, {
      x: 0, y: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'expo.out', delay: delay,
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---------- 6. Preloader → hero intro ---------- */
  var preload = $('#preload');
  var preNum = $('#preloadNum');

  function heroIntro() {
    var tl = gsap.timeline();
    if (heroWords.length) {
      tl.to(heroWords, { yPercent: 0, opacity: 1, duration: 1.25, ease: 'expo.out', stagger: 0.055 }, 0);
    }
    tl.from('#hero .hero__fallback', { opacity: 0, duration: 1.6, ease: 'sine.out' }, 0);
    tl.from('#nav', { yPercent: -120, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.1);
    return tl;
  }

  function finish() {
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
    heroIntro();
  }

  if (preload && !reduce) {
    if (lenis) lenis.stop();
    var counter = { v: 0 };
    gsap.timeline()
      .to(counter, {
        v: 100, duration: 1.15, ease: 'power2.inOut',
        onUpdate: function () {
          if (preNum) preNum.textContent = String(Math.round(counter.v)).padStart(3, '0');
        }
      })
      .to('#preload .preload__in', { opacity: 0, y: -14, duration: 0.45, ease: 'power2.in' })
      .to(preload, {
        yPercent: -100, duration: 0.95, ease: 'expo.inOut',
        onComplete: function () { preload.remove(); }
      }, '-=0.1')
      .add(finish, '-=0.55');
  } else {
    if (preload) preload.remove();
    body.classList.remove('is-loading');
    if (!reduce) heroIntro();
  }

  /* ---------- 7. Hero parallax on scroll ---------- */
  if (!reduce) {
    gsap.to('#hero .hero__in', {
      y: -90, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    gsap.to('#hero .grid-lines', {
      yPercent: 16, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 8. Aurora drift (scroll + pointer) ---------- */
  if (!reduce) {
    $$('[data-float]').forEach(function (el) {
      var k = parseFloat(el.dataset.float) || 1;
      gsap.to(el, {
        yPercent: k % 2 ? -18 : 20, xPercent: k % 2 ? 8 : -9, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom', end: 'bottom top', scrub: 1.2
        }
      });
    });

    var pointerTargets = $$('#hero [data-float]');
    if (pointerTargets.length && window.matchMedia('(hover: hover)').matches) {
      var qx = pointerTargets.map(function (el) { return gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }); });
      var qy = pointerTargets.map(function (el) { return gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }); });
      window.addEventListener('pointermove', function (e) {
        var cx = (e.clientX / window.innerWidth - 0.5);
        var cy = (e.clientY / window.innerHeight - 0.5);
        pointerTargets.forEach(function (el, i) {
          var amp = 40 * (i + 1);
          qx[i](cx * amp); qy[i](cy * amp * 0.6);
        });
      }, { passive: true });
    }
  }

  /* ---------- 9. Counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.dec || '0', 10);
    var suffix = el.dataset.suffix || '';
    var obj = { v: 0 };
    function render() {
      var s = obj.v.toFixed(dec).replace('.', ',');
      el.textContent = s + suffix;
    }
    if (reduce) { obj.v = target; render(); return; }
    render();
    gsap.to(obj, {
      v: target, duration: 1.8, ease: 'power2.out', onUpdate: render,
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  /* ---------- 10. Marquee ---------- */
  var mq = $('#marquee');
  if (mq && !reduce) {
    mq.innerHTML += mq.innerHTML;
    var half = mq.scrollWidth / 2;
    gsap.to(mq, { x: -half, duration: 34, ease: 'none', repeat: -1 });
  }

  /* ---------- 11. Horizontal gallery ---------- */
  var hs = $('#hscroll');
  var hv = $('#hscrollViewport');
  var rail = $('#hrail');

  function buildHorizontal() {
    if (!hs || !hv) return;
    var mm = gsap.matchMedia();

    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {
      hs.classList.remove('is-free');
      var distance = function () { return Math.max(0, hv.scrollWidth - window.innerWidth + 40); };
      var tween = gsap.to(hv, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: hs,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          start: 'top 12%',
          end: function () { return '+=' + (distance() + window.innerHeight * 0.4); },
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            if (rail) gsap.set(rail, { scaleX: 0.08 + self.progress * 0.92 });
          }
        }
      });
      return function () {
        if (tween.scrollTrigger) tween.scrollTrigger.kill(true);
        tween.kill();
        gsap.set(hv, { x: 0 });
      };
    });

    mm.add('(max-width: 900px), (prefers-reduced-motion: reduce)', function () {
      hs.classList.add('is-free');
      gsap.set(hv, { x: 0 });
      return function () { hs.classList.remove('is-free'); };
    });
  }
  buildHorizontal();

  /* ---------- 12. Pipeline + control loop ---------- */
  var steps = $$('#pipeSteps .pstep');
  if (steps.length) {
    steps.forEach(function (st, i) {
      ScrollTrigger.create({
        trigger: st,
        start: 'top 68%',
        end: 'bottom 42%',
        onToggle: function (self) { st.classList.toggle('is-on', self.isActive); }
      });
      if (!reduce) {
        gsap.from(st, {
          opacity: 0, y: 34, duration: 0.9, ease: 'expo.out',
          scrollTrigger: { trigger: st, start: 'top 90%' }
        });
      }
    });

    var arc = $('#loopArc');
    var dot = $('#loopDot');
    if (arc) {
      var R = 150, C = 2 * Math.PI * R;
      gsap.set(arc, { strokeDasharray: C, strokeDashoffset: C });
      if (reduce) {
        gsap.set(arc, { strokeDashoffset: 0 });
      } else {
        gsap.to(arc, {
          strokeDashoffset: 0, ease: 'none',
          scrollTrigger: { trigger: '#pipeSteps', start: 'top 72%', end: 'bottom 60%', scrub: 0.5 }
        });
        if (dot) {
          gsap.to(dot, {
            rotation: 360, transformOrigin: '210px 210px', ease: 'none',
            scrollTrigger: { trigger: '#pipeSteps', start: 'top 72%', end: 'bottom 60%', scrub: 0.5 }
          });
        }
      }
    }
  }

  /* ---------- 13. Card hover tilt (desktop, pointer devices only) ---------- */
  if (!reduce && window.matchMedia('(hover: hover) and (min-width: 901px)').matches) {
    $$('.rcard, .card, .mcard, .citem').forEach(function (card) {
      /* transform is driven by GSAP here — keep it out of the CSS transition */
      card.style.transition = 'border-color .5s, background .5s, box-shadow .6s';
      var rx = gsap.quickTo(card, 'rotationX', { duration: 0.55, ease: 'power3' });
      var ry = gsap.quickTo(card, 'rotationY', { duration: 0.55, ease: 'power3' });
      var ty = gsap.quickTo(card, 'y', { duration: 0.55, ease: 'power3' });
      gsap.set(card, { transformPerspective: 1100, transformOrigin: '50% 50%' });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * 5); rx(-py * 5); ty(-6);
      });
      card.addEventListener('pointerleave', function () { rx(0); ry(0); ty(0); });
    });
  }

  /* ---------- 14. FAQ accordion ---------- */
  function initFaq() {
    var items = $$('.fitem');
    items.forEach(function (item) {
      var btn = $('.fitem__q', item);
      var panel = $('.fitem__a', item);
      if (!btn || !panel) return;
      var inner = panel.firstElementChild;
      var id = 'faq-' + Math.random().toString(36).slice(2, 8);
      panel.id = id;
      btn.setAttribute('aria-controls', id);
      panel.setAttribute('role', 'region');

      btn.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');

        items.forEach(function (other) {
          if (other === item || !other.classList.contains('is-open')) return;
          var op = $('.fitem__a', other);
          other.classList.remove('is-open');
          $('.fitem__q', other).setAttribute('aria-expanded', 'false');
          gsap.to(op, { height: 0, duration: 0.5, ease: 'expo.inOut' });
        });

        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        gsap.to(panel, {
          height: open ? inner.offsetHeight : 0,
          duration: 0.6, ease: 'expo.inOut',
          onComplete: function () {
            if (open) gsap.set(panel, { height: 'auto' });
            ScrollTrigger.refresh();
          }
        });
        if (open && !reduce) {
          gsap.from(inner, { opacity: 0, y: 14, duration: 0.6, ease: 'expo.out', delay: 0.08 });
        }
      });
    });
  }
  initFaq();

  function initFaqFallback() {
    $$('.fitem').forEach(function (item) {
      var btn = item.querySelector('.fitem__q');
      var panel = item.querySelector('.fitem__a');
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.style.height = open ? 'auto' : '0px';
      });
    });
  }

  /* ---------- 15. Refresh on load / resize ---------- */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { ScrollTrigger.refresh(); }, 220);
  });
})();

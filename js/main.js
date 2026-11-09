(function () {
  var root = document.documentElement;

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    root.classList.remove("motion", "motion-x");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    initChrome(!reduce);
    if (reduce) {
      root.classList.remove("motion", "motion-x");
      return;
    }
    initHero();
    initLoop();
    initLedger();
    initConnectTitle();
    initModels();
    initClose();
    initField();
    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
    });
  } catch (err) {
    root.classList.remove("motion", "motion-x");
    gsap.set(".beat-visual, .beat-copy, .line-inner", { clearProps: "all" });
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function initChrome(animated) {
    var header = document.querySelector(".site-header");
    var bar = document.querySelector(".progress > span");
    var timeEl = document.querySelector(".timecode");
    var chapterEl = document.querySelector(".chapter-name");
    var links = gsap.utils.toArray(".site-nav a");
    var chapters = [
      { id: "hero", name: "Пролог" },
      { id: "loop", name: "Петля", href: "#loop" },
      { id: "connect", name: "Связь", href: "#connect" },
      { id: "field", name: "Поле", href: "#field" },
      { id: "models", name: "Модели", href: "#models" },
      { id: "close", name: "Колофон" }
    ];
    var current = "";
    var primed = false;

    function setChapter(name) {
      if (name === current) return;
      current = name;
      chapterEl.textContent = name;
      if (primed && animated) {
        gsap.fromTo(
          chapterEl,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.62, ease: "elastic.out(1, 0.7)", overwrite: true }
        );
      }
      primed = true;
      var match = null;
      chapters.forEach(function (ch) {
        if (ch.name === name) match = ch.href || null;
      });
      links.forEach(function (a) {
        if (match && a.getAttribute("href") === match) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }

    function frame() {
      var mark = window.innerHeight * 0.36;
      var name = chapters[0].name;
      chapters.forEach(function (ch) {
        var el = document.getElementById(ch.id);
        if (!el) return;
        if (el.getBoundingClientRect().top <= mark) name = ch.name;
      });
      setChapter(name);
    }

    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      gsap.set(bar, { scaleX: Math.max(0.012, p) });
      var total = 4 * 60 + 12;
      var s = Math.round(p * total);
      timeEl.textContent = pad(Math.floor(s / 60)) + ":" + pad(s % 60);
      header.classList.toggle("is-solid", window.scrollY > 24);
      frame();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initHero() {
    gsap.from(".hero .line-inner", {
      yPercent: 112,
      duration: 1.2,
      stagger: 0.075,
      ease: "expo.out",
      delay: 0.08
    });
    gsap.from(".hero-media img", {
      scale: 1.08,
      duration: 2.2,
      ease: "power3.out"
    });
    gsap.from(".hero-aside, .hero-lede", {
      y: 18,
      opacity: 0,
      duration: 0.9,
      delay: 0.55,
      stagger: 0.08,
      ease: "power3.out"
    });
    gsap.from(".mark-tick", {
      scale: 0,
      duration: 0.85,
      delay: 0.35,
      ease: "elastic.out(1, 0.55)"
    });
  }

  function band(p, a, b) {
    var fade = 0.14;
    var t;
    if (p < a) t = 1 - (a - p) / fade;
    else if (p > b) t = 1 - (p - b) / fade;
    else t = 1;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return t * t * (3 - 2 * t);
  }

  function initLoop() {
    var beats = gsap.utils.toArray(".beat");
    var buttons = gsap.utils.toArray(".rail-btn");
    var edge = document.querySelector(".warm-edge");
    var fill = document.querySelector(".rail-fill");
    var loop = document.querySelector(".loop");
    var ranges = [
      [0, 0.22],
      [0.39, 0.61],
      [0.78, 1]
    ];
    var targets = [0.1, 0.5, 0.9];
    var mm = gsap.matchMedia();

    function paint(p) {
      var active = 0;
      var best = -1;
      beats.forEach(function (beat, i) {
        var t = band(p, ranges[i][0], ranges[i][1]);
        var visual = beat.querySelector(".beat-visual");
        var copy = beat.querySelector(".beat-copy");
        var img = beat.querySelector("img");
        gsap.set(visual, { opacity: t });
        gsap.set(copy, { opacity: t, y: (1 - t) * 32 });
        if (img) gsap.set(img, { scale: 1.075 - t * 0.075 });
        var on = t > 0.45;
        visual.setAttribute("aria-hidden", on ? "false" : "true");
        copy.setAttribute("aria-hidden", on ? "false" : "true");
        if (t > best) {
          best = t;
          active = i;
        }
      });
      buttons.forEach(function (btn, i) {
        if (i === active) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
      loop.dataset.phase = ["sense", "think", "act"][active];
      if (edge) {
        var heat = band(p, ranges[2][0], ranges[2][1]);
        gsap.set(edge, { scaleY: heat, opacity: heat });
      }
      if (fill) gsap.set(fill, { scaleY: 0.06 + p * 0.94 });
    }

    function pin(endDistance) {
      var st = ScrollTrigger.create({
        trigger: ".loop",
        start: "top top",
        end: endDistance,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          paint(self.progress);
        },
        onRefresh: function (self) {
          paint(self.progress || 0);
        }
      });
      paint(0);
      return st;
    }

    mm.add("(min-width: 960px)", function () {
      var st = pin("+=280%");
      return function () {
        st.kill();
      };
    });
    mm.add("(max-width: 959px)", function () {
      var st = pin("+=200%");
      return function () {
        st.kill();
      };
    });

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-index"));
        var st = ScrollTrigger.getAll().filter(function (item) {
          return item.trigger && item.trigger.classList && item.trigger.classList.contains("loop") && item.vars && item.vars.pin;
        })[0];
        if (!st) {
          beats[i].scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        var y = st.start + targets[i] * (st.end - st.start);
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  function initLedger() {
    gsap.utils.toArray(".ledger li").forEach(function (li) {
      gsap.from(li, {
        y: 22,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: {
          trigger: li,
          start: "top 88%",
          once: true
        }
      });
    });
    gsap.to(".filament > span", {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".ledger",
        start: "top 70%",
        end: "bottom 65%",
        scrub: true
      }
    });
  }

  function initConnectTitle() {
    gsap.from("#connect .line-inner", {
      yPercent: 110,
      duration: 1.05,
      stagger: 0.07,
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#connect",
        start: "top 72%",
        once: true
      }
    });
  }

  function initModels() {
    gsap.utils.toArray(".model").forEach(function (row) {
      gsap.from(row, {
        y: 26,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: row,
          start: "top 88%",
          once: true
        }
      });
    });
  }

  function initClose() {
    gsap.from("#close .line-inner", {
      yPercent: 110,
      duration: 1.15,
      stagger: 0.08,
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#close",
        start: "top 70%",
        once: true
      }
    });
    gsap.from(".period-final", {
      scale: 0,
      duration: 0.9,
      delay: 0.4,
      ease: "elastic.out(1, 0.55)",
      scrollTrigger: {
        trigger: "#close",
        start: "top 70%",
        once: true
      }
    });
  }

  function initField() {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 960px)", function () {
      root.classList.add("motion-x");
      var track = document.querySelector(".field-track");
      var field = document.querySelector(".field");
      var tween = gsap.to(track, {
        x: function () {
          return -(track.scrollWidth - field.clientWidth);
        },
        ease: "none",
        scrollTrigger: {
          trigger: field,
          start: "top top",
          end: function () {
            return "+=" + Math.max(0, track.scrollWidth - field.clientWidth);
          },
          pin: true,
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      return function () {
        root.classList.remove("motion-x");
        tween.scrollTrigger && tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: "transform" });
      };
    });
  }
})();

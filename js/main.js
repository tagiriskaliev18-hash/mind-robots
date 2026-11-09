(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var video = document.querySelector("video");

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
  }

  if (reduce) {
    root.classList.remove("is-film", "is-ready");
    if (video) {
      video.pause();
      video.removeAttribute("autoplay");
    }
    return;
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    root.classList.remove("is-film", "is-ready");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  function playVideo() {
    if (!video) return;
    var pending = video.play();
    if (pending && typeof pending.catch === "function") pending.catch(function () {});
  }

  playVideo();

  fetch("ledger.json")
    .then(function (res) {
      if (!res.ok) throw new Error("ledger");
      return res.json();
    })
    .then(function (ledger) {
      build(ledger);
    })
    .catch(function () {
      root.classList.remove("is-film", "is-ready");
    });

  function build(ledger) {
    var nodes = {};
    document.querySelectorAll(".beat").forEach(function (el) {
      nodes[el.getAttribute("data-id")] = el;
    });

    var approach = ledger.approach;
    var hold = ledger.hold;
    var carried = {};
    var expanded = [];
    var time = 0;

    ledger.beats.forEach(function (beat) {
      var start = time;
      var end = time + beat.span;
      var scale0;
      var keys;

      if (beat.vector === "up") {
        scale0 = carried[beat.media] != null ? carried[beat.media] : 1.12;
        keys = [
          { t: start, scale: scale0, y: 0 },
          { t: end, scale: scale0, y: beat.y || -6 }
        ];
      } else {
        if (beat.cut || carried[beat.media] == null) scale0 = beat.scale0;
        else scale0 = carried[beat.media];
        var mid = scale0 + beat.delta;
        var last = scale0 + beat.delta * 2;
        var tApproach = start + beat.span * approach;
        var tHoldEnd = tApproach + beat.span * hold;
        keys = [
          { t: start, scale: scale0, y: 0 },
          { t: tApproach, scale: mid, y: 0 },
          { t: tHoldEnd, scale: mid, y: 0 },
          { t: end, scale: last, y: 0 }
        ];
        carried[beat.media] = last;
      }

      expanded.push({
        id: beat.id,
        media: beat.media,
        cut: !!beat.cut,
        origin: beat.origin || "50% 45%",
        enter: beat.enter || "hold",
        start: start,
        end: end,
        holdAt: start + beat.span * approach,
        keys: keys
      });
      time = end;
    });

    var total = time;
    var mediaTweens = {};

    expanded.forEach(function (beat) {
      if (!mediaTweens[beat.media]) mediaTweens[beat.media] = [];
      beat.keys.forEach(function (key) {
        var list = mediaTweens[beat.media];
        var prev = list[list.length - 1];
        if (prev && Math.abs(prev.t - key.t) < 0.0001) list[list.length - 1] = key;
        else list.push(key);
      });
    });

    root.classList.add("is-film");

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".reel",
        start: "top top",
        end: function () {
          return "+=" + Math.round(total * 0.085 * window.innerHeight);
        },
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          applyVisibility(self.progress * total);
        }
      }
    });

    Object.keys(mediaTweens).forEach(function (media) {
      var owner = document.querySelector('.beat[data-media="' + media + '"]');
      if (!owner) return;
      var target = owner.querySelector(".media");
      var samples = mediaTweens[media];
      gsap.set(target, { transformOrigin: samplesOrigin(media) });
      for (var i = 0; i < samples.length - 1; i++) {
        var a = samples[i];
        var b = samples[i + 1];
        var dur = b.t - a.t;
        if (dur <= 0) continue;
        tl.fromTo(
          target,
          { scale: a.scale, yPercent: a.y },
          { scale: b.scale, yPercent: b.y, duration: dur, immediateRender: false },
          a.t
        );
      }
    });

    expanded.forEach(function (beat) {
      var copy = nodes[beat.id] && nodes[beat.id].querySelector(".copy");
      if (!copy || beat.enter === "immediate") return;
      var wipe = Math.min(0.7, (beat.end - beat.holdAt) * 0.45);
      tl.set(copy, { clipPath: "inset(0 0 100% 0)" }, beat.start);
      tl.to(
        copy,
        { clipPath: "inset(0 0 0% 0)", duration: wipe, ease: "power1.out", immediateRender: false },
        beat.holdAt
      );
    });

    function samplesOrigin(media) {
      var found = "50% 45%";
      expanded.forEach(function (beat) {
        if (beat.media === media && beat.origin) found = beat.origin;
      });
      return found;
    }

    function applyVisibility(now) {
      var active = expanded[0];
      for (var i = 0; i < expanded.length; i++) {
        if (now + 0.0001 >= expanded[i].start) active = expanded[i];
      }
      document.querySelectorAll(".beat").forEach(function (el) {
        var id = el.getAttribute("data-id");
        var media = el.getAttribute("data-media");
        var firstOfMedia = document.querySelector('.beat[data-media="' + media + '"]') === el;
        el.classList.toggle("is-copy", id === active.id);
        el.classList.toggle("is-media", firstOfMedia && media === active.media);
        var copy = el.querySelector(".copy");
        if (copy) copy.setAttribute("aria-hidden", id === active.id ? "false" : "true");
      });
    }

    applyVisibility(0);
    root.classList.add("is-ready");
    playVideo();
    ScrollTrigger.refresh();
  }
})();

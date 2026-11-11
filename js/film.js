/* Scroll-scrubbed Apollo. The pictures are pre-rendered; this file only
   draws the frame under the cursor and keeps the HUD leaders on the
   anchors Blender projected. */
(function () {
  var FRAMES = 120;
  var STOPS = [0, 0.25, 0.5, 0.75, 1];
  var stage = document.getElementById("stage");
  var leaders = document.getElementById("leaders");
  var plates = [].slice.call(document.querySelectorAll("[data-beat]"));
  var calls = [].slice.call(document.querySelectorAll(".call"));
  var hudIndex = document.getElementById("hud-index");
  var hudCoords = document.getElementById("hud-coords");
  var railFill = document.getElementById("rail-fill");
  var loaderBar = document.getElementById("loader-bar");
  var phoneQuery = window.matchMedia("(max-width: 700px)");
  var still = document.documentElement.classList.contains("is-still");
  var setName = phoneQuery.matches ? "phone" : "desk";
  var ctx = stage.getContext("2d", { alpha: false });
  var anchors = null;
  var progress = still ? 1 : 0;
  var readyMarked = false;
  var lowCache = new Map();
  var fullCache = new Map();

  function pad(i) {
    var s = String(i);
    while (s.length < 3) s = "0" + s;
    return s;
  }

  function frameUrl(pass, i) {
    return "frames/" + setName + "/" + pass + "/" + pad(i) + ".webp";
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, phoneQuery.matches ? 1.5 : 2);
    var w = Math.max(1, stage.clientWidth || window.innerWidth);
    var h = Math.max(1, stage.clientHeight || window.innerHeight);
    stage.width = Math.round(w * dpr);
    stage.height = Math.round(h * dpr);
  }

  function evict(map, keep, limit) {
    while (map.size > limit) {
      var worst = null;
      var worstD = -1;
      map.forEach(function (_rec, key) {
        if (key === keep) return;
        var d = Math.abs(key - keep);
        if (d > worstD) {
          worstD = d;
          worst = key;
        }
      });
      if (worst == null) break;
      var old = map.get(worst);
      old.img.onload = null;
      old.img.src = "";
      map.delete(worst);
    }
  }

  function want(map, index, pass, limit) {
    if (index < 0 || index >= FRAMES) return null;
    var rec = map.get(index);
    if (rec) return rec;
    rec = { img: new Image(), ready: false };
    rec.img.decoding = "async";
    rec.img.onload = function () {
      rec.ready = true;
      draw();
    };
    rec.img.onerror = function () {
      map.delete(index);
    };
    map.set(index, rec);
    rec.img.src = frameUrl(pass, index);
    evict(map, index, limit);
    return rec;
  }

  function nearest(map, index) {
    var best = null;
    var bestD = 1e9;
    map.forEach(function (rec, key) {
      if (!rec.ready) return;
      var d = Math.abs(key - index);
      if (d < bestD) {
        bestD = d;
        best = rec.img;
      }
    });
    return best;
  }

  function markReady() {
    if (readyMarked) return;
    readyMarked = true;
    document.documentElement.classList.add("is-ready");
  }

  function pictureRect(css) {
    var cw = css ? window.innerWidth : stage.width;
    var ch = css ? window.innerHeight : stage.height;
    var ir = setName === "phone" ? 1080 / 1920 : 1920 / 1080;
    var cr = cw / Math.max(1, ch);
    var dw;
    var dh;
    var dx;
    var dy;
    if (ir > cr) {
      dw = cw;
      dh = cw / ir;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * ir;
      dx = (cw - dw) / 2;
      dy = 0;
    }
    return { dx: dx, dy: dy, dw: dw, dh: dh };
  }

  function drawImage(img) {
    var cw = stage.width;
    var ch = stage.height;
    ctx.fillStyle = "#09090f";
    ctx.fillRect(0, 0, cw, ch);
    if (!img || !img.width) return;
    var r = pictureRect(false);
    ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function shownFor(el, p) {
    if (still) return 0;
    var id = Number(el.dataset.beat);
    var dist = Math.abs(p - STOPS[id]);
    var shown = clamp01(1 - (dist - 0.035) / 0.08);
    if (phoneQuery.matches && el.dataset.phone === "off") shown = 0;
    return shown;
  }

  function anchorPoint(index, name) {
    if (!anchors || !anchors.frames[index]) return null;
    var p = anchors.frames[index].a[name];
    if (!p) return null;
    return p;
  }

  function drawLeaders(index) {
    while (leaders.firstChild) leaders.removeChild(leaders.firstChild);
    if (still) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var phoneNow = w < 700;
    var active = calls.filter(function (el) {
      return parseFloat(el.style.opacity || "0") > 0.04;
    });
    var phoneSlot = 0;
    var used = { start: Math.round(h * 0.14), end: Math.round(h * 0.14) };
    var columns = { start: [], end: [] };
    var placed = [];
    var ns = "http://www.w3.org/2000/svg";
    active.forEach(function (el) {
      var pt = anchorPoint(index, el.dataset.anchor);
      if (!pt) {
        el.style.visibility = "hidden";
        return;
      }
      var frame = pictureRect(true);
      var x = frame.dx + pt[0] * frame.dw;
      var y = frame.dy + pt[1] * frame.dh;
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) {
        el.style.visibility = "hidden";
        return;
      }
      var side = x < w * 0.5 ? "start" : "end";
      el.dataset.side = side;
      if (phoneNow) {
        el.style.top = (Math.round(h * (0.072 + phoneSlot * 0.124)) + 8) + "px";
        phoneSlot += 1;
      } else {
        var topPx = Math.max(used[side], Math.min(y - 20, h * 0.58));
        el.style.top = topPx + "px";
        if (side === "start") {
          el.style.left = "3.2vw";
          el.style.width = "min(200px, 16vw)";
          el.style.right = "auto";
        } else {
          el.style.right = "3.2vw";
          el.style.width = "min(200px, 16vw)";
          el.style.left = "auto";
        }
        used[side] = topPx;
        columns[side].push(el);
      }
      placed.push({ el: el, x: x, y: y, side: side });
    });
    if (!phoneNow) {
      ["start", "end"].forEach(function (side) {
        var col = columns[side];
        if (!col.length) return;
        var gap = 16;
        var heights = col.map(function (el) { return el.getBoundingClientRect().height; });
        var cursor = Math.round(h * 0.14);
        var tops = col.map(function (el, i) {
          var anchorY = placed.filter(function (item) { return item.el === el; })[0].y;
          var top = Math.max(cursor, Math.min(anchorY - 20, h * 0.58));
          cursor = top + heights[i] + gap;
          return top;
        });
        var bottom = tops[tops.length - 1] + heights[heights.length - 1];
        var limit = h - 40;
        if (bottom > limit) {
          var shift = bottom - limit;
          var floorTop = Math.round(h * 0.11);
          if (tops[0] - shift < floorTop) shift = Math.max(0, tops[0] - floorTop);
          tops = tops.map(function (top) { return top - shift; });
        }
        col.forEach(function (el, i) {
          el.style.top = Math.round(tops[i]) + "px";
        });
      });
    }
    placed.forEach(function (item) {
      var el = item.el;
      var box = el.getBoundingClientRect();
      var ruleY = box.top + 0.5;
      var outward = item.side === "end" ? 1 : -1;
      var ruleX = phoneNow
        ? (item.side === "end" ? w - 16 : 16)
        : (item.side === "end" ? box.left : box.right);
      var elbowX = item.x + outward * (phoneNow ? 14 : 28);
      var opacity = el.style.opacity || "1";
      var path = document.createElementNS(ns, "polyline");
      var points = phoneNow
        ? [
          item.x.toFixed(1) + "," + item.y.toFixed(1),
          ruleX.toFixed(1) + "," + item.y.toFixed(1),
          ruleX.toFixed(1) + "," + ruleY.toFixed(1)
        ]
        : [
          item.x.toFixed(1) + "," + item.y.toFixed(1),
          elbowX.toFixed(1) + "," + item.y.toFixed(1),
          elbowX.toFixed(1) + "," + ruleY.toFixed(1),
          ruleX.toFixed(1) + "," + ruleY.toFixed(1)
        ];
      path.setAttribute("points", points.join(" "));
      path.setAttribute("stroke-opacity", opacity);
      var dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", item.x.toFixed(1));
      dot.setAttribute("cy", item.y.toFixed(1));
      dot.setAttribute("r", phoneNow ? "2.2" : "2.6");
      dot.setAttribute("fill-opacity", opacity);
      leaders.appendChild(path);
      leaders.appendChild(dot);
    });
  }

  function placeHud(p, index) {
    var beat = Math.min(4, Math.round(p * 4));
    if (hudIndex) hudIndex.innerHTML = String(beat + 1).padStart(2, "0") + "<span>/05</span>";
    if (railFill) railFill.style.top = (p * 100) + "%";
    plates.forEach(function (el) {
      var shown = shownFor(el, p);
      el.style.opacity = String(shown);
      el.style.visibility = shown < 0.04 ? "hidden" : "visible";
    });
    if (hudCoords && anchors && anchors.frames[index]) {
      var cam = anchors.frames[index].cam;
      hudCoords.textContent = "X " + cam[0].toFixed(2) + " · Y " + cam[2].toFixed(2) + " · Z " + cam[1].toFixed(2);
    }
    drawLeaders(index);
  }

  function draw() {
    var index = Math.max(0, Math.min(FRAMES - 1, Math.round(progress * (FRAMES - 1))));
    var span = still ? 0 : 4;
    for (var d = -span; d <= span; d++) want(lowCache, index + d, "low", phoneQuery.matches ? 10 : 16);
    if (!still) {
      want(fullCache, index, "full", phoneQuery.matches ? 3 : 4);
      want(fullCache, index - 1, "full", phoneQuery.matches ? 3 : 4);
      want(fullCache, index + 1, "full", phoneQuery.matches ? 3 : 4);
    } else {
      want(fullCache, FRAMES - 1, "full", 2);
    }
    var full = fullCache.get(index);
    var img = full && full.ready ? full.img : nearest(lowCache, index);
    if (!img) {
      var any = nearest(lowCache, index) || nearest(fullCache, index);
      if (!any) return;
      img = any;
    }
    drawImage(img);
    placeHud(progress, index);
    if (loaderBar) loaderBar.style.width = Math.round(((index + 1) / FRAMES) * 100) + "%";
    markReady();
  }

  resize();
  window.addEventListener("resize", function () {
    var next = phoneQuery.matches ? "phone" : "desk";
    if (next !== setName) {
      setName = next;
      lowCache.clear();
      fullCache.clear();
      anchors = null;
      loadAnchors();
    }
    resize();
    draw();
  });

  window.__film = {
    low: function () { return lowCache.size; },
    full: function () { return fullCache.size; },
    index: function () { return Math.round(progress * (FRAMES - 1)); }
  };

  function loadAnchors() {
    fetch("frames/anchors-" + setName + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        anchors = data;
        draw();
      })
      .catch(function () {});
  }

  loadAnchors();
  [0, 30, 60, 90, FRAMES - 1].forEach(function (i) {
    want(lowCache, i, "low", 16);
  });
  want(fullCache, still ? FRAMES - 1 : 0, "full", 4);

  if (still) {
    progress = 1;
    draw();
    return;
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: "#drive",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        progress = self.progress;
        draw();
      }
    });
  }
  draw();
})();

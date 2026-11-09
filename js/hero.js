/* =========================================================
   MIND / Hero — абстрактное «нейронное ядро» на Three.js
   Не игровой low-poly ассет: светящаяся сфера-оболочка,
   узлы-синапсы, связи и тонкие орбиты.
   Деградирует в CSS-градиент, если WebGL недоступен.
   ========================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof window.THREE === 'undefined') return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 600px)').matches;
  var weak = (navigator.hardwareConcurrency || 4) <= 2;
  if (reduce || weak) return;               // остаётся CSS-фолбэк

  /* --- renderer --- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: !narrow, powerPreference: 'high-performance'
    });
  } catch (e) { return; }

  var DPR = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 0, 7.4);

  var root = new THREE.Group();
  scene.add(root);

  var C_VIOLET = new THREE.Color(0x7B2FF7);
  var C_INDIGO = new THREE.Color(0x4B3BFF);
  var C_BLUE = new THREE.Color(0x1E90FF);
  var C_CYAN = new THREE.Color(0x00F5FF);

  /* ---------------------------------------------------------
     1. Светящееся ядро: икосаэдр с мягкой деформацией и fresnel
     --------------------------------------------------------- */
  var coreUniforms = {
    uTime: { value: 0 },
    uA: { value: C_VIOLET.clone() },
    uB: { value: C_BLUE.clone() },
    uC: { value: C_CYAN.clone() }
  };

  var coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: [
      'uniform float uTime;',
      'varying vec3 vNormal;',
      'varying vec3 vView;',
      'varying float vH;',
      'void main(){',
      '  vec3 p = position;',
      '  float w = sin(p.x*2.2 + uTime*0.7) * sin(p.y*2.6 - uTime*0.55) * sin(p.z*2.0 + uTime*0.45);',
      '  p += normal * w * 0.085;',
      '  vNormal = normalize(normalMatrix * normal);',
      '  vec4 mv = modelViewMatrix * vec4(p,1.0);',
      '  vView = normalize(-mv.xyz);',
      '  vH = (position.y + 1.8) / 3.6;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime;',
      'varying vec3 vNormal; varying vec3 vView; varying float vH;',
      'void main(){',
      '  float f = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));',
      '  float rim = pow(f, 2.6);',
      '  vec3 col = mix(uA, uB, clamp(vH,0.0,1.0));',
      '  col = mix(col, uC, pow(f, 5.0) * 0.85);',
      '  float pulse = 0.86 + 0.14 * sin(uTime * 1.1);',
      '  gl_FragColor = vec4(col, rim * 0.62 * pulse);',
      '}'
    ].join('\n')
  });

  var core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, narrow ? 3 : 5), coreMat);
  root.add(core);

  /* внутренний каркас — ощущение конструкции, а не шара */
  var wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.02, 1)),
    new THREE.LineBasicMaterial({
      color: 0x8da8ff, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  root.add(wire);

  /* ---------------------------------------------------------
     2. Узлы-синапсы на сфере + связи между близкими узлами
     --------------------------------------------------------- */
  var NODE_COUNT = narrow ? 90 : 170;
  var R_SHELL = 2.62;
  var pts = [];
  var gold = Math.PI * (3 - Math.sqrt(5));           // fibonacci sphere
  for (var i = 0; i < NODE_COUNT; i++) {
    var y = 1 - (i / (NODE_COUNT - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = gold * i;
    var jitter = 0.94 + Math.random() * 0.12;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R_SHELL * jitter));
  }

  var nPos = new Float32Array(NODE_COUNT * 3);
  var nCol = new Float32Array(NODE_COUNT * 3);
  var nSize = new Float32Array(NODE_COUNT);
  var nSeed = new Float32Array(NODE_COUNT);
  pts.forEach(function (p, k) {
    nPos[k * 3] = p.x; nPos[k * 3 + 1] = p.y; nPos[k * 3 + 2] = p.z;
    var t = (p.y / R_SHELL + 1) / 2;
    var c = C_VIOLET.clone().lerp(C_BLUE, t);
    if (k % 7 === 0) c = C_CYAN.clone();
    nCol[k * 3] = c.r; nCol[k * 3 + 1] = c.g; nCol[k * 3 + 2] = c.b;
    nSize[k] = (k % 7 === 0 ? 15 : 8) * (0.7 + Math.random() * 0.6);
    nSeed[k] = Math.random() * 6.283;
  });

  var nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(nCol, 3));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nSize, 1));
  nodeGeo.setAttribute('aSeed', new THREE.BufferAttribute(nSeed, 1));

  var nodeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDpr: { value: DPR } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'attribute vec3 aColor; attribute float aSize; attribute float aSeed;',
      'uniform float uTime; uniform float uDpr;',
      'varying vec3 vColor; varying float vFade;',
      'void main(){',
      '  vColor = aColor;',
      '  float breath = 0.75 + 0.45 * sin(uTime * 1.4 + aSeed);',
      '  vFade = breath;',
      '  vec3 p = position * (1.0 + 0.02 * sin(uTime * 0.8 + aSeed));',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = aSize * breath * uDpr * (34.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColor; varying float vFade;',
      'void main(){',
      '  float d = length(gl_PointCoord - vec2(0.5));',
      '  if (d > 0.5) discard;',
      '  float a = pow(1.0 - d * 2.0, 2.2);',
      '  gl_FragColor = vec4(vColor, a * 0.95 * vFade);',
      '}'
    ].join('\n')
  });

  var nodes = new THREE.Points(nodeGeo, nodeMat);
  root.add(nodes);

  /* связи: только между достаточно близкими узлами */
  var linkPos = [];
  var LINK_MAX = R_SHELL * 0.46;
  for (var a = 0; a < pts.length; a++) {
    for (var b = a + 1; b < pts.length; b++) {
      if (pts[a].distanceTo(pts[b]) < LINK_MAX) {
        linkPos.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z);
      }
    }
  }
  var linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3));
  var links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({
    color: 0x00F5FF, transparent: true, opacity: 0.09,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  root.add(links);

  /* ---------------------------------------------------------
     3. Тонкие орбиты — «оси» механики
     --------------------------------------------------------- */
  var rings = new THREE.Group();
  [
    { r: 3.05, rot: [1.15, 0.2, 0.0], c: C_VIOLET, o: 0.5 },
    { r: 3.42, rot: [-0.55, 0.85, 0.3], c: C_BLUE, o: 0.42 },
    { r: 3.78, rot: [0.3, -0.4, 1.2], c: C_CYAN, o: 0.3 }
  ].forEach(function (cfg) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.r, 0.0055, 3, 220),
      new THREE.MeshBasicMaterial({
        color: cfg.c, transparent: true, opacity: cfg.o,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    ring.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    rings.add(ring);
  });
  root.add(rings);

  /* ---------------------------------------------------------
     4. Дальняя пыль — объём и глубина кадра
     --------------------------------------------------------- */
  var DUST = narrow ? 260 : 620;
  var dPos = new Float32Array(DUST * 3);
  var dSize = new Float32Array(DUST);
  var dSeed = new Float32Array(DUST);
  for (var d = 0; d < DUST; d++) {
    var rr = 5 + Math.random() * 10;
    var u = Math.random() * 2 - 1;
    var ph = Math.random() * Math.PI * 2;
    var sr = Math.sqrt(1 - u * u);
    dPos[d * 3] = Math.cos(ph) * sr * rr;
    dPos[d * 3 + 1] = u * rr * 0.75;
    dPos[d * 3 + 2] = Math.sin(ph) * sr * rr - 2;
    dSize[d] = 1.4 + Math.random() * 3.2;
    dSeed[d] = Math.random() * 6.283;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  var dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDpr: { value: DPR } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'attribute float aSize; attribute float aSeed; uniform float uTime; uniform float uDpr;',
      'varying float vA;',
      'void main(){',
      '  vA = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 0.7 + aSeed));',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_PointSize = aSize * uDpr * (26.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying float vA;',
      'void main(){',
      '  float dd = length(gl_PointCoord - vec2(0.5));',
      '  if (dd > 0.5) discard;',
      '  gl_FragColor = vec4(0.72, 0.80, 1.0, pow(1.0 - dd * 2.0, 2.0) * vA * 0.5);',
      '}'
    ].join('\n')
  });
  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------------------------------------------------------
     5. Размеры, позиционирование, резайз
     --------------------------------------------------------- */
  function layout() {
    var hero = document.getElementById('hero');
    var w = hero ? hero.clientWidth : window.innerWidth;
    var h = hero ? hero.clientHeight : window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    var wide = w / h > 1.05;
    /* на широких экранах ядро уходит вправо, освобождая место тексту */
    root.position.x = wide ? Math.min(2.6, w / h * 1.2) : 0;
    root.position.y = wide ? 0.1 : -1.15;
    var s = wide ? 0.94 : (w < 520 ? 0.6 : 0.74);
    root.scale.setScalar(s);
    camera.updateProjectionMatrix();
  }
  layout();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 140);
  });

  /* ---------------------------------------------------------
     6. Ввод: курсор + скролл
     --------------------------------------------------------- */
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  var scrollK = 0;
  function onScroll() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var h = hero.offsetHeight || window.innerHeight;
    scrollK = Math.min(1, Math.max(0, window.pageYOffset / h));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     7. Цикл отрисовки (пауза, когда герой не виден)
     --------------------------------------------------------- */
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.01 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) clock.getDelta();          // не копим дельту
  });

  var clock = new THREE.Clock();
  var t = 0;

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    t += dt;

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    coreUniforms.uTime.value = t;
    nodeMat.uniforms.uTime.value = t;
    dustMat.uniforms.uTime.value = t;

    root.rotation.y += dt * 0.085;
    root.rotation.x = pointer.y * 0.18 + Math.sin(t * 0.25) * 0.05;
    root.rotation.z = -pointer.x * 0.06;

    core.rotation.y -= dt * 0.05;
    wire.rotation.y += dt * 0.03;
    wire.rotation.x -= dt * 0.02;
    nodes.rotation.y -= dt * 0.022;
    links.rotation.y -= dt * 0.022;

    rings.children[0].rotation.z += dt * 0.12;
    rings.children[1].rotation.x -= dt * 0.09;
    rings.children[2].rotation.y += dt * 0.07;

    dust.rotation.y += dt * 0.012;

    /* уход кадра при скролле: лёгкое отдаление и подъём */
    camera.position.x = pointer.x * 0.42;
    camera.position.y = -pointer.y * 0.28 + scrollK * 1.1;
    camera.position.z = 7.4 + scrollK * 2.4;
    camera.lookAt(root.position.x * 0.45, root.position.y * 0.3, 0);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(frame);
  requestAnimationFrame(function () { canvas.classList.add('is-ready'); });
})();

(function () {
  var root = document.documentElement;

  /* ---------- theme ---------- */
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('amk-theme', next); } catch (e) {}
    drawHero();
  });

  /* ---------- mobile menu ---------- */
  var mb = document.getElementById('menuBtn'), mm = document.getElementById('mobileMenu');
  if (mb && mm) {
    mb.addEventListener('click', function () {
      mm.hidden = !mm.hidden;
      mb.setAttribute('aria-expanded', String(!mm.hidden));
    });
    mm.addEventListener('click', function (e) {
      if (e.target.closest('a')) { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000 && !mm.hidden) { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- desktop dropdowns (hover + click/tap on the caret) ---------- */
  function closeAll(except) {
    document.querySelectorAll('.menu > li.open').forEach(function (li) {
      if (li !== except) { li.classList.remove('open'); var c = li.querySelector('.caret'); if (c) c.setAttribute('aria-expanded', 'false'); }
    });
  }
  document.querySelectorAll('.caret').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.parentElement, open = !li.classList.contains('open');
      closeAll(li);
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });

  /* highlight the current section link inside a dropdown */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sub a').forEach(function (a) {
    if (a.getAttribute('href') === here + location.hash) a.classList.add('here');
  });

  /* ---------- certificate images: fall back to the icon if Drive is unreachable ---------- */
  document.querySelectorAll('.honor-thumb img').forEach(function (img) {
    img.addEventListener('error', function () { img.remove(); });
  });

  /* ---------- hero background: hill contours + live water (rain, ripples, floating drops) ---------- */
  var cv = document.getElementById('flow');
  var hero = cv ? cv.closest('.hero') : null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  var ctx, bg, W = 0, H = 0, dpr = 1, blue = '#1D4A9E', navy = '#0F2A52', small = false;
  var rain = [], ripples = [], raf = 0, visible = true, lastSpawn = 0, lastPointer = 0;

  function dropPath(c, sz) {
    c.beginPath();
    c.moveTo(0, -sz * 1.45);
    c.bezierCurveTo(sz * 0.35, -sz * 0.75, sz, -sz * 0.1, sz, sz * 0.35);
    c.arc(0, sz * 0.35, sz, 0, Math.PI, false);
    c.bezierCurveTo(-sz, -sz * 0.1, -sz * 0.35, -sz * 0.75, 0, -sz * 1.45);
    c.closePath();
  }

  /* static layer: terrain contours, drawn once per size/theme into an offscreen canvas */
  function buildStatic() {
    bg = document.createElement('canvas');
    bg.width = cv.width; bg.height = cv.height;
    var c = bg.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    function g(x, y, cx, cy, s) { return Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * s * s)); }
    function h(x, y) {
      return g(x, y, W * 0.84, H * 0.30, Math.max(W * 0.15, 140))
        + 0.75 * g(x, y, W * 0.60, H * 0.92, Math.max(W * 0.12, 120))
        + 0.6 * g(x, y, W * 1.03, H * 0.95, Math.max(W * 0.10, 110))
        + 0.45 * g(x, y, W * 0.06, H * 0.10, Math.max(W * 0.10, 110))
        + 0.07 * Math.sin(x / 60) * Math.cos(y / 48);
    }
    var step = small ? 10 : 7, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, grid = [], i, j;
    for (j = 0; j < rows; j++) { grid[j] = []; for (i = 0; i < cols; i++) grid[j][i] = h(i * step, j * step); }
    for (var k = 1; k <= 16; k++) {
      var lv = k * 0.075;
      c.strokeStyle = k % 4 === 0 ? navy : blue;
      c.globalAlpha = (k % 4 === 0 ? 0.20 : 0.10) + 0.006 * k;
      c.lineWidth = k % 4 === 0 ? 1.3 : 0.9;
      c.beginPath();
      for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
        var a = grid[j][i], b = grid[j][i + 1], d = grid[j + 1][i + 1], e = grid[j + 1][i], x = i * step, y = j * step, p = [];
        if ((a < lv) !== (b < lv)) p.push([x + step * (lv - a) / (b - a), y]);
        if ((b < lv) !== (d < lv)) p.push([x + step, y + step * (lv - b) / (d - b)]);
        if ((e < lv) !== (d < lv)) p.push([x + step * (lv - e) / (d - e), y + step]);
        if ((a < lv) !== (e < lv)) p.push([x, y + step * (lv - a) / (e - a)]);
        if (p.length >= 2) { c.moveTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); }
        if (p.length === 4) { c.moveTo(p[2][0], p[2][1]); c.lineTo(p[3][0], p[3][1]); }
      }
      c.stroke();
    }
  }

  function setup() {
    if (!cv) return false;
    var r = cv.getBoundingClientRect();
    if (!r.width) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; small = W < 700;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx = cv.getContext('2d');
    var cs = getComputedStyle(root);
    blue = cs.getPropertyValue('--blue').trim() || '#1D4A9E';
    navy = cs.getPropertyValue('--navy').trim() || '#0F2A52';
    buildStatic();
    rain = [];
    ripples = [];
    /* a few ripples already spreading so the first frame is never empty */
    [[0.92, 0.70], [0.55, 0.18], [0.30, 0.86], [0.98, 0.12]].forEach(function (p, n) {
      addRipple(p[0] * W, p[1] * H, 70 + n * 8, n * 0.22);
    });
    return true;
  }

  function addRipple(x, y, max, startAge) {
    ripples.push({ x: x, y: y, max: max || 60 + Math.random() * 40, age: startAge || 0, life: 4.2 + Math.random() * 1.2 });
  }
  function addRain() {
    var x = (small ? Math.random() : 0.4 + Math.random() * 0.6) * W;
    var land = H * (0.25 + Math.random() * 0.7);
    rain.push({ x: x, y: -20, land: land, v: 70 + Math.random() * 40, sz: 2.5 + Math.random() * 2 });
  }

  function render(dt, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ripples: three rings per splash, spreading and fading */
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.age += dt;
      var k = rp.age / rp.life;
      if (k >= 1) { ripples.splice(i, 1); continue; }
      for (var n = 0; n < 3; n++) {
        var kk = k - n * 0.12;
        if (kk <= 0) continue;
        var rad = rp.max * (1 - Math.pow(1 - kk, 2.2));
        ctx.globalAlpha = Math.max(0, 0.22 * (1 - kk)) * (1 - n * 0.25);
        ctx.strokeStyle = blue; ctx.lineWidth = 1.4 - n * 0.3;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rad, rad * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* falling rain: a short streak with a drop head; splashes into a ripple */
    for (i = rain.length - 1; i >= 0; i--) {
      var d = rain[i];
      d.y += d.v * dt;
      if (d.y >= d.land) { addRipple(d.x, d.land); rain.splice(i, 1); continue; }
      var g = ctx.createLinearGradient(d.x, d.y - 14, d.x, d.y);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, blue);
      ctx.globalAlpha = 0.28; ctx.strokeStyle = g; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y - 14); ctx.lineTo(d.x, d.y); ctx.stroke();
      ctx.save(); ctx.translate(d.x, d.y); dropPath(ctx, d.sz);
      ctx.globalAlpha = 0.35; ctx.fillStyle = blue; ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  var last = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var t = now / 1000, dt = last ? Math.min(t - last, 0.05) : 0.016;
    last = t;
    if (now - lastSpawn > (small ? 3400 : 2400) + Math.random() * 600) { lastSpawn = now; addRain(); }
    render(dt, t);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && !reduce.matches && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function init() {
    stop();
    if (!setup()) return;
    if (reduce.matches) { render(0, 0); return; }   /* still picture for reduced motion */
    render(0, 0);
    start();
  }
  function drawHero() { init(); }

  if (cv) {
    init();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(init, 150); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', init);
    reduce.addEventListener('change', init);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
    }
    /* touch the water: moving the pointer or clicking sends out ripples */
    hero.addEventListener('pointermove', function (e) {
      if (reduce.matches || e.timeStamp - lastPointer < 420) return;
      lastPointer = e.timeStamp;
      var r = cv.getBoundingClientRect();
      addRipple(e.clientX - r.left, e.clientY - r.top, 26 + Math.random() * 14);
    });
    hero.addEventListener('pointerdown', function (e) {
      if (reduce.matches) return;
      var r = cv.getBoundingClientRect();
      addRipple(e.clientX - r.left, e.clientY - r.top, 90);
      addRipple(e.clientX - r.left, e.clientY - r.top, 55, 0.3);
    });
  }
})();

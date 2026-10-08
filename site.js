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

  /* ---------- hero background: hill contours, rain drops and ripples ---------- */
  var cv = document.getElementById('flow');
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function drawHero() {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, r.width, r.height);
    var cs = getComputedStyle(root);
    var blue = cs.getPropertyValue('--blue').trim() || '#1D4A9E';
    var navy = cs.getPropertyValue('--navy').trim() || '#0F2A52';
    var W = r.width, H = r.height, small = W < 700;

    /* 1. terrain contours (three hills, like a hill-tract catchment) */
    function g(x, y, cx, cy, s) { return Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * s * s)); }
    function h(x, y) {
      return g(x, y, W * 0.84, H * 0.30, Math.max(W * 0.15, 140))
        + 0.75 * g(x, y, W * 0.60, H * 0.92, Math.max(W * 0.12, 120))
        + 0.6 * g(x, y, W * 1.03, H * 0.95, Math.max(W * 0.10, 110))
        + 0.45 * g(x, y, W * 0.06, H * 0.10, Math.max(W * 0.10, 110))
        + 0.07 * Math.sin(x / 60) * Math.cos(y / 48);
    }
    var step = small ? 10 : 7, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, grid = [];
    for (var j = 0; j < rows; j++) { grid[j] = []; for (var i = 0; i < cols; i++) grid[j][i] = h(i * step, j * step); }
    c.lineWidth = 1;
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

    /* 3. ripples where drops land */
    var ripples = [[0.92, 0.70, 46], [0.55, 0.18, 34], [0.30, 0.86, 28], [0.98, 0.12, 30]];
    ripples.forEach(function (rp) {
      for (var n = 1; n <= 4; n++) {
        c.globalAlpha = 0.24 - n * 0.045; c.strokeStyle = blue; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(W * rp[0], H * rp[1], rp[2] * n * 0.55, rp[2] * n * 0.22, 0, 0, Math.PI * 2); c.stroke();
      }
    });

    /* 4. scattered rain drops */
    var rand = rng(20251108), count = small ? 22 : 46;
    for (var q = 0; q < count; q++) {
      var px = rand(), py = rand(), sz = 4 + rand() * 13, tilt = (rand() - 0.5) * 0.5;
      // keep most drops away from the text column on the left
      if (!small && px < 0.45 && rand() < 0.7) px = 0.45 + rand() * 0.55;
      var X = px * W, Y = py * H;
      c.save(); c.translate(X, Y); c.rotate(tilt);
      c.beginPath();
      c.moveTo(0, -sz * 1.45);
      c.bezierCurveTo(sz * 0.35, -sz * 0.75, sz, -sz * 0.1, sz, sz * 0.35);
      c.arc(0, sz * 0.35, sz, 0, Math.PI, false);
      c.bezierCurveTo(-sz, -sz * 0.1, -sz * 0.35, -sz * 0.75, 0, -sz * 1.45);
      c.closePath();
      c.globalAlpha = 0.07 + rand() * 0.12; c.fillStyle = q % 5 === 0 ? navy : blue; c.fill();
      if (q % 3 === 0) { c.globalAlpha = 0.25; c.strokeStyle = blue; c.lineWidth = 1; c.stroke(); }
      c.restore();
    }
    c.globalAlpha = 1;
  }
  drawHero();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawHero, 150); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawHero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawHero);
})();

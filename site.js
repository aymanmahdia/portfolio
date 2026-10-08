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

  /* ---------- hero background: flowing water lines + gentle rain and ripples ---------- */
  var cv = document.getElementById('flow');
  var hero = cv ? cv.closest('.hero') : null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ctx, W = 0, H = 0, dpr = 1, blue = '#1D4A9E', navy = '#0F2A52', small = false;
  var rain = [], ripples = [], raf = 0, visible = true, lastSpawn = 0, lastPointer = 0;

  /* two currents of thin lines, each line a little out of step with the next, so the band ripples like water */
  var CURRENTS = [
    { y: 0.30, spread: 0.26, lines: 15, amp: 26, k1: 0.0042, k2: 0.0093, s1: 0.22, s2: 0.13, alpha: 0.16, dark: false },
    { y: 0.74, spread: 0.30, lines: 13, amp: 34, k1: 0.0031, k2: 0.0078, s1: -0.18, s2: 0.11, alpha: 0.13, dark: true }
  ];
  function surfaceY(cur, i, x, t) {
    var f = i / (cur.lines - 1);
    var base = H * (cur.y - cur.spread / 2 + cur.spread * f);
    var a = cur.amp * (0.55 + 0.45 * Math.sin(f * Math.PI));
    return base
      + a * Math.sin(x * cur.k1 + t * cur.s1 + f * 1.6)
      + a * 0.45 * Math.sin(x * cur.k2 - t * cur.s2 + f * 2.4);
  }

  function dropPath(c, sz) {
    c.beginPath();
    c.moveTo(0, -sz * 1.45);
    c.bezierCurveTo(sz * 0.35, -sz * 0.75, sz, -sz * 0.1, sz, sz * 0.35);
    c.arc(0, sz * 0.35, sz, 0, Math.PI, false);
    c.bezierCurveTo(-sz, -sz * 0.1, -sz * 0.35, -sz * 0.75, 0, -sz * 1.45);
    c.closePath();
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
    rain = []; ripples = [];
    return true;
  }

  function addRipple(x, y, max, startAge) {
    ripples.push({ x: x, y: y, max: max || 50 + Math.random() * 30, age: startAge || 0, life: 4.2 + Math.random() * 1.2 });
  }
  function addRain(t) {
    var x = (small ? 0.1 + Math.random() * 0.85 : 0.42 + Math.random() * 0.56) * W;
    var cur = CURRENTS[Math.random() < 0.5 ? 0 : 1];
    var land = surfaceY(cur, Math.floor(Math.random() * cur.lines), x, t + 2);
    rain.push({ x: x, y: -16, land: Math.max(40, land), v: 70 + Math.random() * 40, sz: 2.5 + Math.random() * 2 });
  }

  function render(dt, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var step = small ? 10 : 8;

    /* flowing lines */
    CURRENTS.forEach(function (cur) {
      ctx.strokeStyle = cur.dark ? navy : blue;
      for (var i = 0; i < cur.lines; i++) {
        var f = i / (cur.lines - 1);
        ctx.globalAlpha = cur.alpha * (0.45 + 0.55 * Math.sin(f * Math.PI));
        ctx.lineWidth = i % 4 === 0 ? 1.3 : 0.8;
        ctx.beginPath();
        for (var x = -step; x <= W + step; x += step) {
          var y = surfaceY(cur, i, x, t);
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });

    /* ripples */
    for (var j = ripples.length - 1; j >= 0; j--) {
      var rp = ripples[j];
      rp.age += dt;
      var k = rp.age / rp.life;
      if (k >= 1) { ripples.splice(j, 1); continue; }
      for (var n = 0; n < 3; n++) {
        var kk = k - n * 0.12;
        if (kk <= 0) continue;
        var rad = rp.max * (1 - Math.pow(1 - kk, 2.2));
        ctx.globalAlpha = Math.max(0, 0.24 * (1 - kk)) * (1 - n * 0.25);
        ctx.strokeStyle = blue; ctx.lineWidth = 1.3 - n * 0.3;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rad, rad * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* rain */
    for (j = rain.length - 1; j >= 0; j--) {
      var d = rain[j];
      d.y += d.v * dt;
      if (d.y >= d.land) { addRipple(d.x, d.land); rain.splice(j, 1); continue; }
      var g = ctx.createLinearGradient(d.x, d.y - 14, d.x, d.y);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, blue);
      ctx.globalAlpha = 0.28; ctx.strokeStyle = g; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y - 14); ctx.lineTo(d.x, d.y); ctx.stroke();
      ctx.save(); ctx.translate(d.x, d.y); dropPath(ctx, d.sz);
      ctx.globalAlpha = 0.35; ctx.fillStyle = blue; ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  var last = 0, clock = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var t = now / 1000, dt = last ? Math.min(t - last, 0.05) : 0.016;
    last = t; clock += dt;
    if (now - lastSpawn > (small ? 3400 : 2400) + Math.random() * 600) { lastSpawn = now; addRain(clock); }
    render(dt, clock);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && !reduce.matches && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function init() {
    stop();
    if (!setup()) return;
    render(0, clock);
    if (!reduce.matches) start();   /* reduced motion: one still frame */
  }
  function drawHero() { init(); }

  if (cv) {
    init();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(init, 150); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', init);
    reduce.addEventListener('change', init);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
    }
    hero.addEventListener('pointermove', function (e) {
      if (reduce.matches || e.timeStamp - lastPointer < 420) return;
      lastPointer = e.timeStamp;
      var r = cv.getBoundingClientRect();
      addRipple(e.clientX - r.left, e.clientY - r.top, 24 + Math.random() * 12);
    });
    hero.addEventListener('pointerdown', function (e) {
      if (reduce.matches) return;
      var r = cv.getBoundingClientRect();
      addRipple(e.clientX - r.left, e.clientY - r.top, 80);
      addRipple(e.clientX - r.left, e.clientY - r.top, 50, 0.3);
    });
  }
})();

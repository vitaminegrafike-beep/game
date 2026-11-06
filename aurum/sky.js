// Cielo stellato dietro l'eclissi: blu quasi nero, stelle e costellazioni che ruotano lentamente
(function () {
  var canvas = document.querySelector(".col__sky");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pin = canvas.parentNode;

  // generatore pseudo-casuale con seme fisso: il cielo è sempre lo stesso
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // costellazioni (coordinate locali, unità ~ un decimo dell'altezza dello schermo)
  var SHAPES = [
    // Grande Carro
    { pts: [[0, 0], [1.1, 0.15], [2.0, 0.45], [2.9, 0.55], [3.2, 1.45], [4.3, 1.55], [4.5, 0.6]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] },
    // Cassiopea
    { pts: [[0, 0.6], [0.8, 0], [1.5, 0.7], [2.3, 0.2], [3.0, 0.9]], lines: [[0,1],[1,2],[2,3],[3,4]] },
    // Orione
    { pts: [[0, 0], [2.0, 0.2], [0.85, 1.55], [1.1, 1.6], [1.35, 1.65], [0.2, 3.0], [2.1, 3.1], [1.0, -0.7]], lines: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[0,7],[1,7]] },
    // Cigno
    { pts: [[1.2, 0], [1.2, 1.0], [1.2, 2.1], [0, 0.9], [2.4, 1.1], [1.2, 2.9]], lines: [[0,1],[1,2],[2,5],[3,1],[1,4]] },
    // Lira
    { pts: [[0.4, 0], [0, 0.8], [0.8, 0.9], [0.1, 1.7], [0.9, 1.8]], lines: [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4]] },
    // Leone
    { pts: [[0, 1.2], [0.6, 0.6], [1.3, 0.4], [1.8, 0.9], [1.5, 1.5], [3.6, 1.0], [3.9, 1.8], [1.4, 2.2]], lines: [[0,1],[1,2],[2,3],[3,4],[4,7],[4,5],[5,6],[6,7]] }
  ];

  var stars = [], figures = [];
  var W = 0, H = 0, dpr = 1, R = 0, pole = { x: 0, y: 0 };

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = pin.clientWidth; H = pin.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // polo celeste sopra lo schermo, un po' a destra: il cielo gira attorno a lui
    pole.x = W * 0.62; pole.y = -H * 0.55;
    R = Math.hypot(Math.max(pole.x, W - pole.x), H - pole.y) * 1.05;

    seed = 7; stars = []; figures = [];
    var area = Math.PI * R * R;
    var n = Math.round(area / 2600);
    for (var i = 0; i < n; i++) {
      var r = R * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
      var m = Math.pow(rnd(), 3.2); // pochissime stelle luminose, molte deboli
      stars.push({
        r: r, a: a,
        size: 0.35 + m * 1.5,
        alpha: 0.25 + m * 0.75,
        tw: rnd() * Math.PI * 2, tws: 0.4 + rnd() * 1.4,
        hue: rnd() < 0.18 ? "255,226,190" : (rnd() < 0.3 ? "190,210,255" : "235,240,255")
      });
    }

    // costellazioni distribuite attorno al polo, nella fascia che attraversa la parte alta dello schermo
    var unit = H * 0.085;
    var ring = Math.hypot(W * 0.5, H * 0.75);
    SHAPES.forEach(function (s, k) {
      var a0 = Math.PI * 0.5 + (k - 2.5) * 0.42 + (rnd() - 0.5) * 0.12;
      var r0 = ring * (0.72 + rnd() * 0.42);
      var rot = rnd() * Math.PI * 2;
      var pts = s.pts.map(function (p) {
        var x = p[0] * unit, y = p[1] * unit;
        var cx = Math.cos(rot) * x - Math.sin(rot) * y, cy = Math.sin(rot) * x + Math.cos(rot) * y;
        var px = Math.cos(a0) * r0 + cx, py = Math.sin(a0) * r0 + cy;
        return { r: Math.hypot(px, py), a: Math.atan2(py, px), size: 1.1 + rnd() * 0.9 };
      });
      figures.push({ pts: pts, lines: s.lines });
    });
  }

  var t0 = performance.now();
  var SPEED = 0.02; // radianti al secondo: un giro ogni ~5 minuti, movimento ben visibile

  function pos(o, ang) {
    var a = o.a + ang;
    return { x: pole.x + Math.cos(a) * o.r, y: pole.y + Math.sin(a) * o.r };
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    var ang = reduce ? 0 : t * SPEED;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], p = pos(s, ang);
      if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
      var tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * s.tws + s.tw);
      ctx.fillStyle = "rgba(" + s.hue + "," + (s.alpha * tw).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, s.size, 0, 6.2832); ctx.fill();
      if (s.size > 1.4) { // alone delle stelle più luminose
        ctx.fillStyle = "rgba(" + s.hue + "," + (0.08 * tw).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, s.size * 3.2, 0, 6.2832); ctx.fill();
      }
    }

    // costellazioni: linee sottili color oro pallido, stelle un po' più luminose
    ctx.lineWidth = 0.7;
    figures.forEach(function (f, k) {
      var pts = f.pts.map(function (o) { return pos(o, ang); });
      var breathe = reduce ? 1 : 0.8 + 0.2 * Math.sin(t * 0.35 + k * 1.7);
      ctx.strokeStyle = "rgba(214,190,150," + (0.22 * breathe).toFixed(3) + ")";
      ctx.beginPath();
      f.lines.forEach(function (l) { ctx.moveTo(pts[l[0]].x, pts[l[0]].y); ctx.lineTo(pts[l[1]].x, pts[l[1]].y); });
      ctx.stroke();
      pts.forEach(function (p, j) {
        var o = f.pts[j];
        ctx.fillStyle = "rgba(245,236,220,0.9)";
        ctx.beginPath(); ctx.arc(p.x, p.y, o.size, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(245,236,220,0.1)";
        ctx.beginPath(); ctx.arc(p.x, p.y, o.size * 3.5, 0, 6.2832); ctx.fill();
      });
    });

    if (!reduce && visible) requestAnimationFrame(draw);
  }

  // anima solo quando la fascia è sullo schermo
  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      var was = visible; visible = e[0].isIntersecting;
      if (visible && !was && !reduce) requestAnimationFrame(draw);
    }).observe(pin);
  }

  build();
  requestAnimationFrame(draw);
  var timer;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { build(); if (reduce) requestAnimationFrame(draw); }, 150);
  });
})();

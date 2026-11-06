// Cielo stellato dietro l'eclissi: stelle e costellazioni reali (sky-data.js) in proiezione polare,
// che ruotano attorno alla Stella Polare; a turno una costellazione si illumina con il suo nome
(function () {
  var canvas = document.querySelector(".col__sky");
  if (!canvas || typeof SKY_STARS === "undefined") return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pin = canvas.parentNode;
  var RAD = Math.PI / 180;

  // generatore pseudo-casuale con seme fisso, solo per il pulviscolo di stelle debolissime
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var W = 0, H = 0, dpr = 1, K = 1, pole = { x: 0, y: 0 };
  var stars = [], dust = [], cons = [];
  // costellazioni famose che possono illuminarsi; le altre restano solo in filigrana
  var ICON = ["URSA MAJOR", "URSA MINOR", "CASSIOPEIA", "CEPHEUS", "CYGNUS", "LYRA", "PERSEUS", "AURIGA", "GEMINI",
    "LEO", "BOÖTES", "CORONA BOREALIS", "HERCULES", "ANDROMEDA", "PEGASUS", "ORION"];

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = pin.clientWidth; H = pin.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // polo nord celeste sopra lo schermo, un po' a destra; K = pixel per grado
    pole.x = W * 0.6; pole.y = -H * 0.2;
    K = Math.max(H, W * 0.56) / 80;

    stars = SKY_STARS.map(function (s, i) {
      var m = s[2];
      return {
        r: (90 - s[1]) * K, a: s[0] * RAD,
        size: Math.max(0.45, Math.min(2.7, (6 - m) * 0.45)),
        alpha: Math.max(0.3, Math.min(1, 0.35 + (5.6 - m) * 0.16)),
        tw: (i * 2.399) % 6.283, tws: 0.4 + (i % 7) * 0.2,
        hue: i % 9 === 0 ? "255,224,186" : (i % 5 === 0 ? "196,214,255" : "238,242,255")
      };
    });

    seed = 7; dust = [];
    var R = Math.hypot(Math.max(pole.x, W - pole.x), H - pole.y);
    var n = Math.round(R * R / 2600);
    for (var i = 0; i < n; i++) {
      dust.push({ r: R * Math.sqrt(rnd()), a: rnd() * Math.PI * 2, alpha: 0.1 + rnd() * 0.3, size: 0.35 + rnd() * 0.35 });
    }

    cons = SKY_CONS.map(function (c) {
      var segs = [];
      c.l.forEach(function (line) {
        for (var i = 0; i < line.length - 1; i++) {
          segs.push([{ r: (90 - line[i][1]) * K, a: line[i][0] * RAD }, { r: (90 - line[i + 1][1]) * K, a: line[i + 1][0] * RAD }]);
        }
      });
      return { name: c.n, segs: segs, icon: ICON.indexOf(c.n) >= 0 };
    });
  }

  function pos(o, rot) {
    var a = o.a + rot;
    return { x: pole.x + Math.cos(a) * o.r, y: pole.y + Math.sin(a) * o.r };
  }

  var t0 = performance.now();
  var SPEED = 0.02;   // radianti al secondo: un giro ogni ~5 minuti
  var START = 2.9;    // rotazione iniziale: Lira, Ercole e Corona Boreale in vista
  var LIT = 6;        // secondi per ogni costellazione illuminata
  var litIdx = -1, litStart = -10;

  function draw(now) {
    var t = (now - t0) / 1000;
    // vista da dentro la sfera: verso nord il cielo gira in senso antiorario
    var rot = START - (reduce ? 0 : t * SPEED);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var lim = H * 0.7;

    dust.forEach(function (d) {
      var p = pos(d, rot);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > lim) return;
      ctx.fillStyle = "rgba(220,228,255," + d.alpha + ")";
      ctx.fillRect(p.x, p.y, d.size * 2, d.size * 2);
    });

    stars.forEach(function (s) {
      var p = pos(s, rot);
      if (p.x < -6 || p.x > W + 6 || p.y < -6 || p.y > lim) return;
      var tw = reduce ? 1 : 0.78 + 0.22 * Math.sin(t * s.tws + s.tw);
      ctx.fillStyle = "rgba(" + s.hue + "," + (s.alpha * tw).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, s.size, 0, 6.2832); ctx.fill();
      if (s.size > 1.5) {
        ctx.fillStyle = "rgba(" + s.hue + "," + (0.09 * tw).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, s.size * 3.2, 0, 6.2832); ctx.fill();
      }
    });

    // posizione attuale di ogni figura
    var placed = cons.map(function (c) {
      var pts = c.segs.map(function (sg) { return [pos(sg[0], rot), pos(sg[1], rot)]; });
      var cx = 0, cy = 0, bottom = -Infinity, top = Infinity, left = Infinity, right = -Infinity, n = 0;
      pts.forEach(function (sg) {
        cx += sg[0].x + sg[1].x; cy += sg[0].y + sg[1].y; n += 2;
        bottom = Math.max(bottom, sg[0].y, sg[1].y); top = Math.min(top, sg[0].y, sg[1].y);
        left = Math.min(left, sg[0].x, sg[1].x); right = Math.max(right, sg[0].x, sg[1].x);
      });
      return { name: c.name, icon: c.icon, pts: pts, cx: cx / n, cy: cy / n, top: top, bottom: bottom, left: left, right: right };
    });

    // scelta della prossima costellazione da illuminare, tra quelle ben visibili
    if (!reduce && t - litStart > LIT) {
      litStart = t;
      // figure famose quasi tutte in vista e non nascoste dietro l'orologio al centro;
      // se non ce ne sono, si accetta una figura vista in parte
      var cand = [], loose = [];
      placed.forEach(function (p, k) {
        if (k === litIdx || !p.icon) return;
        var vis = 0, behind = 0, tot = 0;
        p.pts.forEach(function (sg) {
          [sg[0], sg[1]].forEach(function (q) {
            tot++;
            if (q.x > 0 && q.x < W && q.y > H * 0.12 && q.y < H * 0.62) vis++;
            if (q.x > W * 0.36 && q.x < W * 0.64 && q.y > H * 0.2) behind++;
          });
        });
        vis /= tot; behind /= tot;
        if (vis >= 0.85 && behind <= 0.15) cand.push(k);
        else if (vis >= 0.7 && behind <= 0.3) loose.push(k);
      });
      if (!cand.length) cand = loose;
      litIdx = cand.length ? cand[Math.floor(Math.random() * cand.length)] : -1;
    }
    var lt = t - litStart;
    var trace = Math.min(1, lt / 1.8);
    var glow = lt < 1.8 ? lt / 1.8 : lt < 4 ? 1 : Math.max(0, 1 - (lt - 4) / 2);
    glow = glow * glow * (3 - 2 * glow);

    placed.forEach(function (p, k) {
      // tutte le figure in filigrana
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(214,190,150,0.16)";
      ctx.beginPath();
      p.pts.forEach(function (sg) { ctx.moveTo(sg[0].x, sg[0].y); ctx.lineTo(sg[1].x, sg[1].y); });
      ctx.stroke();

      var g = k === litIdx ? glow : 0;
      if (g < 0.001) return;
      // linee accese, tracciate una dopo l'altra
      ctx.save();
      ctx.shadowColor = "rgba(255,200,120," + (0.9 * g).toFixed(3) + ")";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,222,165," + (0.85 * g).toFixed(3) + ")";
      var n = p.pts.length;
      ctx.beginPath();
      p.pts.forEach(function (sg, i) {
        var part = Math.min(1, Math.max(0, trace * n - i));
        if (part <= 0) return;
        ctx.moveTo(sg[0].x, sg[0].y);
        ctx.lineTo(sg[0].x + (sg[1].x - sg[0].x) * part, sg[0].y + (sg[1].y - sg[0].y) * part);
      });
      ctx.stroke();
      // stelle della figura che si accendono
      ctx.fillStyle = "rgba(255,236,205," + (0.95 * g).toFixed(3) + ")";
      p.pts.forEach(function (sg) {
        [sg[0], sg[1]].forEach(function (q) { ctx.beginPath(); ctx.arc(q.x, q.y, 1.6 + 0.6 * g, 0, 6.2832); ctx.fill(); });
      });
      ctx.restore();
      // nome della costellazione
      ctx.save();
      ctx.font = "300 " + Math.max(10, Math.round(H * 0.013)) + "px Inter, sans-serif";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0.32em";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(226,200,156," + (0.8 * g).toFixed(3) + ")";
      // il nome sopra la figura (sotto c'è l'eclissi), oppure sotto se la figura tocca il bordo alto
      var ly = p.top > H * 0.18 ? p.top - H * 0.025 : Math.min(H * 0.45, p.bottom + H * 0.04);
      ctx.fillText(p.name, Math.min(W * 0.92, Math.max(W * 0.08, p.cx)), ly);
      ctx.restore();
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

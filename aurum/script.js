(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var scrolly = document.getElementById("scrolly");
  var film = document.getElementById("film");
  var ui = document.getElementById("ui");
  var fading = [].slice.call(ui.querySelectorAll(".badges, .scroll"));
  // titolo, sottotitolo e CTA si sfocano in sequenza durante lo zoom finale
  var softening = [].slice.call(ui.querySelectorAll(".intro__title, .intro__sub, .intro__btn"));
  var scrim = document.getElementById("scrim");
  var chapters = [].slice.call(document.querySelectorAll(".chapter"));
  var links = [].slice.call(document.querySelectorAll(".nav__menu [data-chapter]"));

  // Fascia Collection: eclissi, luce e lancette (le lancette segnano l'ora reale)
  var col = document.getElementById("next");
  var pin = col.querySelector(".col__pin");
  var handH = col.querySelector(".col__hand--h");
  var handM = col.querySelector(".col__hand--m");
  var BASE_M = 51.3, BASE_H = 302.5; // angoli delle lancette nella foto (gradi, da ore 12)
  var colCurrent = reduce ? 1 : 0;

  function renderCollection() {
    var vh = window.innerHeight;
    var top = col.getBoundingClientRect().top;
    var target = reduce ? 1 : Math.min(1, Math.max(0, (vh - top) / (col.offsetHeight)));
    colCurrent += (target - colCurrent) * 0.12;
    if (Math.abs(target - colCurrent) < 0.0005) colCurrent = target;
    // l'eclissi sorge mentre la fascia entra e si ferma
    var p = Math.min(1, Math.max(0, (colCurrent - 0.18) / 0.62));
    p = p * p * (3 - 2 * p);
    var sheen = Math.min(1, Math.max(0, (colCurrent - 0.62) / 0.3));
    pin.style.setProperty("--p", p.toFixed(4));
    pin.style.setProperty("--sheen", sheen.toFixed(4));

    var now = new Date();
    var sec = now.getSeconds() + now.getMilliseconds() / 1000;
    var min = now.getMinutes() + sec / 60;
    var hr = (now.getHours() % 12) + min / 60;
    // prima che l'eclissi sia piena le lancette sono indietro di due giri e li recuperano con lo scroll
    var spin = (1 - p) * 720;
    var aM = min * 6 - spin, aH = hr * 30 - spin / 12;
    handM.style.transform = "rotate(" + (aM - BASE_M).toFixed(3) + "deg)";
    handH.style.transform = "rotate(" + (aH - BASE_H).toFixed(3) + "deg)";
    requestAnimationFrame(renderCollection);
  }
  requestAnimationFrame(renderCollection);

  if (reduce) {
    // Niente scrubbing: hero statica seguita dalle sezioni
    root.classList.add("reduced");
    var hero = document.getElementById("hero");
    hero.parentNode.insertBefore(document.querySelector(".chapters"), hero.nextSibling);
    return;
  }

  var mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  film.src = film.getAttribute(mobile ? "data-mobile" : "data-desktop");
  film.load();

  var target = 0;   // progresso dello scroll, 0..1
  var current = 0;  // progresso mostrato, insegue target
  var FADE = 0.04;  // i testi della hero svaniscono nei primi punti percentuali
  var EASE = 0.12;  // quanto avvicinarsi a target a ogni frame
  var FILM = 0.84;  // il film occupa lo scroll fino a qui, poi zoom finale con blur
  var ZOOM = 0.6;   // ingrandimento extra a fine scroll
  var BLUR = 14;    // px di blur a fine scroll

  function progress() {
    var max = scrolly.offsetHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function fade(p, start, end) {
    var edge = 0.04;
    if (p <= start || p >= end) return 0;
    return Math.min(1, (p - start) / edge, (end - p) / edge);
  }

  function render() {
    target = progress();
    var d = target - current;
    current = Math.abs(d) < 0.0002 ? target : current + d * EASE;

    if (film.readyState >= 1 && film.duration) {
      var t = Math.min(1, current / FILM) * (film.duration - 0.05);
      if (Math.abs(film.currentTime - t) > 0.001) film.currentTime = t;
    }

    // dopo l'ultimo fotogramma l'orologio continua ad avvicinarsi e sfoca
    var z = Math.max(0, (current - FILM) / (1 - FILM));
    z = z * z * (3 - 2 * z);
    film.style.transform = z ? "scale(" + (1 + ZOOM * z) + ")" : "";
    film.style.filter = z ? "blur(" + (BLUR * z) + "px)" : "";
    var zl = Math.max(0, (current - FILM) / (1 - FILM));
    softening.forEach(function (el, i) {
      var k = Math.min(1, Math.max(0, (zl - i * 0.2) / 0.5));
      el.style.filter = k ? "blur(" + (10 * k) + "px)" : "";
      el.style.opacity = k ? 1 - 0.75 * k : "";
    });

    // titolo e CTA restano; riquadri e indicatore di scroll svaniscono
    var s = Math.max(0, 1 - target / FADE);
    fading.forEach(function (el) { el.style.opacity = s; el.style.visibility = s ? "" : "hidden"; });
    scrim.style.opacity = 1 - s;

    chapters.forEach(function (el) {
      var o = fade(current, +el.dataset.start, +el.dataset.end);
      el.style.opacity = o;
      el.style.transform = "translateY(" + (1 - o) * 2 + "vh)";
      el.classList.toggle("is-lit", o > 0);
    });

    // il menu resta neutro nella hero: "Collections" si accende con la fascia successiva
    var below = window.scrollY > scrolly.offsetHeight - window.innerHeight * 0.5;
    links.forEach(function (a, i) { a.classList.toggle("is-active", below && i === 0); });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();

(function () {
  'use strict';

  var cfg = window.PUSTEBLUME || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile Navigation ---------- */

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- Startseite: Scroll-Effekt ---------- */

  var hero = document.querySelector('.hero__content');
  if (hero) {
    var heroScroll = document.querySelector('.hero__scroll');
    var headerLogo = document.querySelector('.site-header__logo');
    var startBg = document.querySelector('.bg-start');
    var ticking = false;

    var clamp = function (v) { return Math.min(1, Math.max(0, v)); };

    var update = function () {
      ticking = false;
      var h = window.innerHeight || 800;
      var y = window.scrollY;
      var p = clamp(y / (h * 0.6));
      var q = clamp(y / (h * 0.9));
      var ease = p * p * (3 - 2 * p);

      if (!reduceMotion) {
        hero.style.transform = 'translateY(' + (-ease * 260) + 'px) scale(' + (1 - ease * 0.08) + ')';
      }
      hero.style.opacity = 1 - ease;
      if (heroScroll) heroScroll.style.opacity = 1 - ease;
      if (headerLogo) headerLogo.style.opacity = ease;
      if (startBg) startBg.style.opacity = 1 - q;
    };

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Freie Termine ---------- */

  var termineList = document.getElementById('termine-list');
  if (termineList) {
    var monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    var heute = new Date(); heute.setHours(0, 0, 0, 0);

    var termine = (cfg.termine || [])
      .map(function (t) {
        var parts = t.datum.split('-');
        return Object.assign({}, t, { date: new Date(+parts[0], +parts[1] - 1, +parts[2]) });
      })
      .filter(function (t) { return t.date >= heute && t.plaetze > 0; })
      .sort(function (a, b) { return a.date - b.date; });

    if (!termine.length) {
      termineList.innerHTML =
        '<p class="termine__empty">Aktuell sind keine offenen Termine eingetragen. ' +
        'Frag gerne Deinen Wunschtermin über das <a href="kontakt.html?anliegen=frei">Kontaktformular</a> an!</p>';
    } else {
      termine.forEach(function (t) {
        var tag = String(t.date.getDate()).padStart(2, '0');
        var monat = monate[t.date.getMonth()];
        var wochentag = tage[t.date.getDay()];
        var plaetze = t.plaetze === 1 ? 'noch 1 Platz frei' : 'noch ' + t.plaetze + ' Plätze frei';
        var nachricht = 'Hallo Tanja, ich möchte gerne beim Termin am ' + wochentag + ', ' +
          t.date.getDate() + '. ' + monat + ' (' + t.zeit + ') dabei sein.';

        var el = document.createElement('article');
        el.className = 'termin';
        el.innerHTML =
          '<div class="termin__date"><span class="termin__day"></span><span class="termin__month"></span></div>' +
          '<div class="termin__info"><div class="termin__title"></div><div class="termin__meta"></div><div class="termin__seats"></div></div>' +
          '<a class="btn">Termin anfragen</a>';
        el.querySelector('.termin__day').textContent = tag;
        el.querySelector('.termin__month').textContent = monat;
        el.querySelector('.termin__title').textContent = t.titel;
        el.querySelector('.termin__meta').textContent = wochentag + ' · ' + t.zeit;
        el.querySelector('.termin__seats').textContent = plaetze;
        el.querySelector('.btn').href =
          'kontakt.html?anliegen=frei&nachricht=' + encodeURIComponent(nachricht);
        termineList.appendChild(el);
      });
    }
  }

  /* ---------- Kontaktformular ---------- */

  var form = document.getElementById('contact-form');
  if (form) {
    var anliegenMap = {
      info: 'Kostenloses Infogespräch',
      coaching: 'Kunsttherapeutisches Coaching',
      frei: 'Freies Malen – Terminanfrage',
      geschenk: 'Kleinigkeiten zum Verschenken',
    };
    var params = new URLSearchParams(window.location.search);
    if (anliegenMap[params.get('anliegen')]) form.anliegen.value = anliegenMap[params.get('anliegen')];
    if (params.get('nachricht')) form.nachricht.value = params.get('nachricht');

    var thanks = document.getElementById('contact-thanks');
    var errorEl = document.getElementById('contact-error');
    var submitBtn = form.querySelector('button[type="submit"]');

    var showThanks = function () {
      form.hidden = true;
      thanks.hidden = false;
      thanks.querySelector('h2').focus();
    };

    var errorMsg = errorEl.querySelector('.form__error-msg');
    var defaultError = errorMsg.textContent;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.hidden = true;

      var data = {
        anliegen: form.anliegen.value,
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        telefon: form.telefon.value.trim(),
        nachricht: form.nachricht.value.trim(),
        datenschutz: form.datenschutz.checked,
        botcheck: form.botcheck.checked,
      };

      submitBtn.disabled = true;
      fetch(cfg.kontaktApi || '/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; });
        })
        .then(function (json) {
          if (!json.ok) throw { userMessage: json.error };
          showThanks();
        })
        .catch(function (err) {
          errorMsg.textContent = (err && err.userMessage) || defaultError;
          errorEl.hidden = false;
        })
        .then(function () { submitBtn.disabled = false; });
    });

    document.getElementById('contact-reset').addEventListener('click', function () {
      form.reset();
      form.nachricht.value = '';
      thanks.hidden = true;
      form.hidden = false;
      form.name.focus();
    });
  }
})();

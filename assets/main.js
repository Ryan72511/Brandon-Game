/* MASTER CONTROL — shared behaviors.
   Everything degrades: no JS = fully composed page, no motion. */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- timecode HUD ---------- */
  var tc = document.querySelector('[data-timecode]');
  if (tc) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    if (reduceMotion) {
      var tickSlow = function () {
        var d = new Date();
        tc.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      };
      tickSlow();
      setInterval(tickSlow, 1000);
    } else {
      var frame = function () {
        var d = new Date();
        var ff = Math.floor(d.getMilliseconds() / 1000 * 30);
        tc.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ':' + pad(ff);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
  }

  /* ---------- lower-third build-on + signal-flow draw + count-up stats ---------- */
  var observed = document.querySelectorAll('.lt-animate, .signal-flow, [data-countup]');
  if ('IntersectionObserver' in window && observed.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.hasAttribute('data-countup')) startCount(e.target);
        else e.target.classList.add('built');
      });
    }, { threshold: 0.35 });
    observed.forEach(function (el) { io.observe(el); });
  } else {
    observed.forEach(function (el) {
      el.classList.add('built');
      if (el.hasAttribute('data-countup')) el.textContent = el.getAttribute('data-countup');
    });
  }

  function startCount(el) {
    var final = el.getAttribute('data-countup');
    var target = parseInt(final.replace(/[^0-9]/g, ''), 10);
    if (reduceMotion || !target) { el.textContent = final; return; }
    var suffix = final.replace(/^[0-9,]+/, '');
    var t0 = null, dur = 900;
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  /* ---------- rundown expand/collapse ---------- */
  document.querySelectorAll('.rundown-item').forEach(function (item, i) {
    var btn = item.querySelector('.rundown-row');
    var detail = item.querySelector('.rundown-detail');
    if (!btn || !detail) return;
    detail.id = detail.id || 'rundown-panel-' + (i + 1);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', detail.id);
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- keep active nav link in view on narrow screens ---------- */
  var activeLink = document.querySelector('.topnav a[aria-current="page"]');
  var nav = document.querySelector('.topnav');
  if (activeLink && nav && nav.scrollWidth > nav.clientWidth) {
    var delta = activeLink.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollLeft += delta - (nav.clientWidth - activeLink.offsetWidth) / 2;
  }

  /* ---------- "take" navigation: flash frame then hard cut ---------- */
  var flash = document.querySelector('.flash-frame');
  if (flash && !reduceMotion) {
    document.querySelectorAll('[data-take]').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
        ev.preventDefault();
        var href = link.getAttribute('href');
        flash.classList.add('on');
        setTimeout(function () { window.location.href = href; }, 120);
      });
    });
    // clear flash if page restored from bfcache
    window.addEventListener('pageshow', function () { flash.classList.remove('on'); });
  }

  /* ---------- playhead scroll bar ---------- */
  var ph = document.querySelector('.playhead-bar');
  if (ph) {
    var cursor = ph.querySelector('.ph-cursor');
    var label = ph.querySelector('.ph-label');
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-ph-label]'));
    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      cursor.style.left = (p * 100) + '%';
      if (label && sections.length) {
        var current = sections[0];
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= window.innerHeight * 0.4) current = sections[i];
        }
        label.textContent = current.getAttribute('data-ph-label');
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- timezone clock strip (brand page) ---------- */
  var tzClocks = document.querySelectorAll('[data-tz]');
  if (tzClocks.length) {
    var tickTz = function () {
      tzClocks.forEach(function (el) {
        try {
          el.textContent = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: el.getAttribute('data-tz')
          }).format(new Date());
        } catch (e) { el.textContent = '--:--:--'; }
      });
    };
    tickTz();
    setInterval(tickTz, 1000);
  }

  /* ---------- print chip ---------- */
  var printBtn = document.querySelector('[data-print]');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();

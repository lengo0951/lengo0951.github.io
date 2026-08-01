/* Scientist homepage — vanilla JS
   Theme toggle (persisted) · scroll-spy nav · publication year filter
   No frameworks. No build step. */

(function () {
  'use strict';

  const root = document.documentElement;
  const toggles = document.querySelectorAll('.theme-toggle');

  /* ---------- Theme toggle (persisted) ---------- */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    toggles.forEach(function (toggle) {
      toggle.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
  }
  // Sync initial aria-pressed (root may already have data-theme from inline boot script)
  applyTheme(root.getAttribute('data-theme') || 'light');

  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      applyTheme(next);
    });
  });

  /* ---------- Scroll-spy: highlight active nav link ---------- */
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"], .site-nav-links a[href^="#"]');
  const sectionIds = Array.from(navLinks).map(a => a.getAttribute('href').slice(1));
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(s => observer.observe(s));
  }

  /* ---------- Publication year filter ---------- */
  const filterBtns = document.querySelectorAll('.pub-filter-btn');
  const pubs = document.querySelectorAll('.pub[data-year]');
  const yearHeads = document.querySelectorAll('.pub-year');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const year = btn.dataset.year;
      filterBtns.forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });

      pubs.forEach(p => {
        const show = year === 'all' || p.dataset.year === year;
        p.hidden = !show;
      });

      // Hide year headings whose data-year doesn't match (falls back to textContent for legacy markup)
      yearHeads.forEach(h => {
        const headYear = (h.dataset.year || h.textContent || '').trim();
        h.hidden = !(year === 'all' || year === headYear);
      });
    });
  });
})();

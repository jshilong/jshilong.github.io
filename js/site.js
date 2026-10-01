// Page chrome: light/dark toggle, section-aware nav, and the video preview on a publication thumbnail.
// Everything here is optional; without JS the page renders the same content and follows the system theme.
(function () {
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const query = (q) => (window.matchMedia ? window.matchMedia(q) : null);
  const reduceMotion = Boolean(query('(prefers-reduced-motion: reduce)')?.matches);

  // ---- Light / dark toggle ----
  const toggle = $('#themeToggle');
  const darkQuery = query('(prefers-color-scheme: dark)');
  const themeMetas = $$('meta[name="theme-color"]');
  const metaDefaults = themeMetas.map((m) => m.getAttribute('content'));
  const THEME_COLORS = { light: '#fcfbf8', dark: '#141413' };

  const systemTheme = () => (darkQuery && darkQuery.matches ? 'dark' : 'light');
  const currentTheme = () => root.getAttribute('data-theme') || systemTheme();

  function syncThemeUi() {
    const explicit = root.getAttribute('data-theme');
    themeMetas.forEach((m, i) => m.setAttribute('content', explicit ? THEME_COLORS[explicit] : metaDefaults[i]));
    if (toggle) {
      const label = `Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} mode`;
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
    }
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      // Choosing the system's own theme means "follow the system" again.
      if (next === systemTheme()) {
        root.removeAttribute('data-theme');
        try { localStorage.removeItem('theme'); } catch { }
      } else {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch { }
      }
      syncThemeUi();
    });
  }
  if (darkQuery) {
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeUi);
    else if (darkQuery.addListener) darkQuery.addListener(syncThemeUi);
  }
  syncThemeUi();

  // ---- Nav: hairline once scrolled, underline the section being read ----
  const nav = $('#siteNav');
  const navLinks = $$('#navLinks a[href^="#"]');
  const sections = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  let ticking = false;

  function updateNav() {
    ticking = false;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 4);
    const line = (nav ? nav.offsetHeight : 0) + window.innerHeight * 0.25;
    let current = null;
    sections.forEach((el) => { if (el.getBoundingClientRect().top <= line) current = el; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1] || null;
    }
    navLinks.forEach((a) => {
      const on = Boolean(current) && a.getAttribute('href') === `#${current.id}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function requestNavUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateNav);
  }
  window.addEventListener('scroll', requestNavUpdate, { passive: true });
  window.addEventListener('resize', requestNavUpdate);
  updateNav();

  // ---- Footer year ----
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // ---- Video previews: fetched only on devices that can hover, played while the paper's row is hovered ----
  if (!query('(hover: hover) and (pointer: fine)')?.matches) return;
  const videos = $$('video.pub__teaser[data-src]');
  if (!videos.length) return;

  function loadPoster(video) {
    if (video.dataset.posterLoaded) return;
    video.dataset.posterLoaded = 'true';
    const poster = video.dataset.poster;
    if (!poster) return;
    const img = new Image();
    img.onload = () => {
      video.poster = poster;
      video.classList.add('is-ready');
    };
    img.src = poster;
  }

  const posterIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        posterIO.unobserve(entry.target);
        loadPoster(entry.target);
      });
    }, { rootMargin: '600px 0px' })
    : null;

  videos.forEach((video) => {
    const row = video.closest('.pub');
    if (!row) return;
    if (posterIO) posterIO.observe(video);
    else loadPoster(video);

    video.addEventListener('error', () => video.classList.remove('is-ready'));

    // With reduced motion the still poster is shown instead of the clip.
    const start = () => {
      loadPoster(video);
      if (reduceMotion) return;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.currentTime = 0;
      const playing = video.play();
      if (playing && playing.catch) playing.catch(() => { });
    };
    const stop = () => {
      if (!reduceMotion) video.pause();
    };

    row.addEventListener('mouseenter', start);
    row.addEventListener('mouseleave', stop);
    row.addEventListener('focusin', start);
    row.addEventListener('focusout', (e) => {
      if (!row.contains(e.relatedTarget)) stop();
    });
  });
})();

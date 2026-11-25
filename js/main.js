(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.header');
  const menu = document.querySelector('.mobile-menu');
  const toggle = document.querySelector('.menu-toggle');
  const mobileLayout = window.matchMedia('(max-width: 1100px)');
  const pageContent = document.querySelectorAll('main, .footer, .whatsapp-float, .skip-link');

  document.querySelectorAll('[data-year]').forEach(function (element) {
    element.textContent = new Date().getFullYear();
  });

  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setMenuOpen(open) {
    if (open === (toggle.getAttribute('aria-expanded') === 'true')) return;

    if (!open && menu.contains(document.activeElement)) {
      toggle.focus({ preventScroll: true });
    }

    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.toggleAttribute('inert', !open);
    menu.setAttribute('aria-hidden', String(!open));
    pageContent.forEach(function (element) {
      element.toggleAttribute('inert', open);
    });

    if (open) {
      menu.querySelector('a').focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', function () {
    setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.querySelectorAll('.mobile-menu a, .header a').forEach(function (link) {
    link.addEventListener('click', function () {
      setMenuOpen(false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenuOpen(false);
    }
  });

  mobileLayout.addEventListener('change', function (event) {
    if (!event.matches) setMenuOpen(false);
  });

  if (!('IntersectionObserver' in window)) return;

  const hero = document.querySelector('.hero');
  const whatsapp = document.querySelector('.whatsapp-float');
  const heroObserver = new IntersectionObserver(function ([entry]) {
    whatsapp.classList.toggle('is-hidden', entry.boundingClientRect.bottom > 0);
  });
  heroObserver.observe(hero);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  initSteps(reducedMotion);
  initGallery(reducedMotion);

  if (reducedMotion.matches) return;

  const revealObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  });

  document.querySelectorAll('[data-reveal]').forEach(function (element) {
    revealObserver.observe(element);
  });

  function initSteps(reducedMotion) {
    const timeline = document.querySelector('.steps__wrap');
    const line = timeline.querySelector('.steps__line');
    const markers = Array.from(timeline.querySelectorAll('.step__num'));
    let visible = false;
    let frame = null;

    function updateProgress() {
      frame = null;
      if (reducedMotion.matches) return;

      const checkpoint = window.innerHeight * 0.65;
      const bounds = line.getBoundingClientRect();
      if (!bounds.height) return;

      const progress = Math.max(0, Math.min(1, (checkpoint - bounds.top) / bounds.height));
      const filled = markers.map(function (marker) {
        const { top, height } = marker.getBoundingClientRect();
        return top + height / 2 <= checkpoint;
      });

      line.style.setProperty('--steps-progress', progress);
      markers.forEach(function (marker, index) {
        marker.classList.toggle('is-filled', filled[index]);
      });
    }

    function scheduleUpdate() {
      if (frame === null && !reducedMotion.matches) {
        frame = window.requestAnimationFrame(updateProgress);
      }
    }

    window.addEventListener('scroll', function () {
      if (visible) scheduleUpdate();
    }, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    reducedMotion.addEventListener('change', scheduleUpdate);

    const observer = new IntersectionObserver(function ([entry]) {
      visible = entry.isIntersecting;
      scheduleUpdate();
    });
    observer.observe(timeline);
  }

  function initGallery(reducedMotion) {
    const track = document.querySelector('.gallery__track');
    const photos = track.querySelector('.gallery__group');
    const toggle = document.querySelector('.gallery__toggle');
    const copies = [];
    const pixelsPerSecond = 32;
    let cycleWidth = 0;
    let frame = null;
    let lastTime = null;
    let position = 0;
    let lastPixel = 0;
    let visible = false;
    let paused = false;
    let hovered = false;
    let focused = false;
    let resumeTimer;

    function advance(time) {
      if (lastTime !== null) {
        const seconds = Math.min(time - lastTime, 50) / 1000;
        position = (position + seconds * pixelsPerSecond) % cycleWidth;
      }
      lastTime = time;

      const pixel = Math.floor(position);
      if (pixel !== lastPixel) {
        track.scrollLeft = pixel;
        lastPixel = pixel;
      }

      frame = window.requestAnimationFrame(advance);
    }

    function stopPlayback() {
      if (frame === null) return;
      window.cancelAnimationFrame(frame);
      frame = null;
    }

    function syncPlayback() {
      if (!visible || document.hidden || !copies.length || paused || hovered || focused || resumeTimer !== undefined) {
        stopPlayback();
        return;
      }
      if (frame !== null) return;

      lastPixel = Math.max(0, track.scrollLeft);
      position = lastPixel % cycleWidth;
      lastTime = null;
      frame = window.requestAnimationFrame(advance);
    }

    function syncLayout() {
      stopPlayback();
      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      cycleWidth = photos.getBoundingClientRect().width + gap;
      const count = reducedMotion.matches || !cycleWidth ? 0 : Math.ceil(track.clientWidth / cycleWidth);

      // Cada volta precisa de cópias suficientes para preencher a área visível.
      while (copies.length < count) {
        const copy = photos.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copies.push(copy);
        track.appendChild(copy);
      }
      while (copies.length > count) copies.pop().remove();

      track.classList.toggle('is-looping', count > 0);
      toggle.hidden = count === 0;
      syncPlayback();
    }

    function pauseForInput() {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(function () {
        resumeTimer = undefined;
        syncPlayback();
      }, 1800);
      syncPlayback();
    }

    toggle.addEventListener('click', function () {
      paused = !paused;
      toggle.textContent = paused ? 'Retomar galeria' : 'Pausar galeria';
      syncPlayback();
    });
    track.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'mouse') return;
      hovered = true;
      syncPlayback();
    });
    track.addEventListener('pointerleave', function () {
      hovered = false;
      syncPlayback();
    });
    track.addEventListener('focusin', function (event) {
      focused = event.target.matches(':focus-visible');
      syncPlayback();
    });
    track.addEventListener('focusout', function () {
      focused = false;
      syncPlayback();
    });
    track.addEventListener('keydown', function () {
      focused = true;
      syncPlayback();
    });
    ['pointerdown', 'touchmove', 'wheel'].forEach(function (eventName) {
      track.addEventListener(eventName, pauseForInput, { passive: true });
    });

    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('resize', syncLayout);
    reducedMotion.addEventListener('change', syncLayout);

    const observer = new IntersectionObserver(function ([entry]) {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(track);
    syncLayout();
  }
})();

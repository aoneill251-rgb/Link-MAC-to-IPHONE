/* =============================================================
   H5 HAIR BY JANET WELDON  ·  main.js
   ============================================================= */

'use strict';

/* ----- NAV: scroll shadow + floating book button visibility ----- */
const nav       = document.getElementById('nav');
const floatBook = document.getElementById('floatBook');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav?.classList.toggle('scrolled', y > 20);
  floatBook?.classList.toggle('visible', y > 500);
}, { passive: true });


/* ----- MOBILE NAV TOGGLE ----- */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

// Close on link click
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle?.classList.remove('open');
    navToggle?.setAttribute('aria-label', 'Open menu');
  });
});


/* ----- SCROLL REVEAL (Intersection Observer) ----- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Un-observe after reveal (one-shot)
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold:  0.1,
  rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ----- REVIEWS CAROUSEL ----- */
(function initReviews() {
  const track         = document.getElementById('reviewsTrack');
  const dotsContainer = document.getElementById('reviewsDots');
  const prevBtn       = document.getElementById('reviewPrev');
  const nextBtn       = document.getElementById('reviewNext');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.review-card'));
  const total = cards.length;
  let current = 0;
  let timer;

  /* Build dot buttons */
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className   = 'reviews-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Review ${i + 1} of ${total}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer?.appendChild(dot);
  });

  function setActive(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer?.querySelectorAll('.reviews-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  }

  function goTo(idx) {
    setActive(idx);
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  /* Pause autoplay on hover / focus */
  track.addEventListener('mouseenter', () => clearInterval(timer));
  track.addEventListener('mouseleave',  resetTimer);
  track.addEventListener('focusin',    () => clearInterval(timer));
  track.addEventListener('focusout',   resetTimer);

  /* Touch / swipe support */
  let touchStartX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) goTo(diff > 0 ? current + 1 : current - 1);
  }, { passive: true });

  /* Keyboard left/right when carousel has focus */
  document.getElementById('reviewsCarousel')?.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  /* Kick off */
  setActive(0);
  resetTimer();
})();


/* ----- TEAM PHOTO FALLBACK (initials avatar) ----- */
document.querySelectorAll('.team-card__photo').forEach(img => {
  function showInitials() {
    const initials = (this || img).dataset.initials
      || (this || img).alt.slice(0, 2).toUpperCase()
      || '?';
    const wrap = (this || img).parentElement;
    if (wrap) {
      wrap.innerHTML =
        `<span class="team-card__initials" aria-label="${(this || img).alt}">${initials}</span>`;
    }
  }
  img.addEventListener('error', showInitials);
  // Also trigger if already broken (e.g., cached 404)
  if (img.complete && !img.naturalWidth) showInitials.call(img);
});


/* ----- COOKIE BANNER ----- */
const COOKIE_KEY    = 'h5hair_cookie_v1';
const cookieBanner  = document.getElementById('cookieBanner');

if (cookieBanner && !localStorage.getItem(COOKIE_KEY)) {
  // Small delay so it doesn't pop instantly
  setTimeout(() => { cookieBanner.style.display = 'block'; }, 1200);
}

document.getElementById('cookieAccept')?.addEventListener('click', () => {
  localStorage.setItem(COOKIE_KEY, 'accepted');
  cookieBanner.style.display = 'none';
});
document.getElementById('cookieDecline')?.addEventListener('click', () => {
  localStorage.setItem(COOKIE_KEY, 'declined');
  cookieBanner.style.display = 'none';
});


/* ----- SMOOTH-SCROLL for anchor links (polyfill for older Safari) ----- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY
                - parseInt(getComputedStyle(document.documentElement)
                    .getPropertyValue('--nav-h') || '72', 10);
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

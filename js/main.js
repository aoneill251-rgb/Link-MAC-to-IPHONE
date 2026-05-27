// Nav scroll shadow
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

// Close mobile nav on link click
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-label', 'Open menu');
  });
});

// Cookie banner
const COOKIE_KEY = 'h5hair_cookie_consent';
const cookieBanner = document.getElementById('cookieBanner');
if (cookieBanner && !localStorage.getItem(COOKIE_KEY)) {
  cookieBanner.style.display = 'block';
}
document.getElementById('cookieAccept')?.addEventListener('click', () => {
  localStorage.setItem(COOKIE_KEY, 'accepted');
  cookieBanner.style.display = 'none';
});
document.getElementById('cookieDecline')?.addEventListener('click', () => {
  localStorage.setItem(COOKIE_KEY, 'declined');
  cookieBanner.style.display = 'none';
});

// Disable past dates in booking form
const dateInput = document.getElementById('preferredDate');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}

// Booking form validation & submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm()) submitForm();
  });
}

function validateForm() {
  let valid = true;

  function setError(fieldId, errorId, msg) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (msg) {
      field?.classList.add('error');
      if (error) error.textContent = msg;
      valid = false;
    } else {
      field?.classList.remove('error');
      if (error) error.textContent = '';
    }
  }

  const firstName = document.getElementById('firstName')?.value.trim();
  setError('firstName', 'firstNameError', firstName ? '' : 'First name is required.');

  const lastName = document.getElementById('lastName')?.value.trim();
  setError('lastName', 'lastNameError', lastName ? '' : 'Last name is required.');

  const email = document.getElementById('email')?.value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  setError('email', 'emailError', emailOk ? '' : 'Please enter a valid email address.');

  const service = document.getElementById('service')?.value;
  setError('service', 'serviceError', service ? '' : 'Please select a service.');

  const date = document.getElementById('preferredDate')?.value;
  setError('preferredDate', 'preferredDateError', date ? '' : 'Please select a preferred date.');

  const gdpr = document.getElementById('gdprConsent')?.checked;
  const gdprError = document.getElementById('gdprError');
  if (!gdpr) {
    if (gdprError) gdprError.textContent = 'You must agree to continue.';
    valid = false;
  } else {
    if (gdprError) gdprError.textContent = '';
  }

  return valid;
}

function submitForm() {
  const form = document.getElementById('bookingForm');
  const success = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
  }

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(new FormData(form)).toString()
  })
    .then(() => {
      form.style.display = 'none';
      if (success) {
        success.style.display = 'block';
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    })
    .catch(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Booking Request';
      }
      alert('Something went wrong — please try again or contact us directly.');
    });
}

// Team photo fallback — shows initials when no photo is uploaded yet
document.querySelectorAll('.team-card__photo').forEach(img => {
  img.addEventListener('error', function () {
    const initials = this.dataset.initials || this.alt || '?';
    const wrap = this.parentElement;
    wrap.innerHTML = `<span class="team-card__initials" aria-label="${this.alt}">${initials}</span>`;
  });
});

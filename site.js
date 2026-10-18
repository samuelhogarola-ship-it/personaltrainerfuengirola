document.documentElement.classList.add('js');

function initUmamiAnalytics() {
  if (
    !window.UmamiAnalyticsCore ||
    typeof window.UmamiAnalyticsCore.init !== 'function'
  ) {
    return;
  }

  window.WFAnalytics = window.WFAnalytics || {};
  window.WFAnalytics.trackEvent = function (eventName, params) {
    if (!eventName || typeof window.UmamiAnalyticsCore.trackEvent !== 'function') return;
    window.UmamiAnalyticsCore.trackEvent(eventName, params || {});
  };

  window
    .fetch('/umami-config.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}))
    .then((config) => {
      window.UmamiAnalyticsCore.init(config);
    });
}

function analyticsPayload(element) {
  return {
    locale: element.dataset.analyticsLocale || document.documentElement.lang || 'es',
    destination: element.getAttribute('href') || element.getAttribute('action') || '',
    label: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    page: window.location.pathname,
  };
}

function inferredAnalyticsEvent(element) {
  const href = (element.getAttribute('href') || '').toLowerCase();

  if (element.matches('form')) return 'contact_form_submit';
  if (href.includes('wa.me/') || href.includes('whatsapp.com/send')) return 'whatsapp_click';
  if (href.startsWith('tel:')) return 'phone_click';
  if (href.startsWith('mailto:')) return 'email_click';
  if (/calendly|acuityscheduling|simplybook|setmore|book|reserv/.test(href)) {
    return 'external_booking_click';
  }
  if (
    element.matches(
      '.home-header-cta, .hero-actions a, .button, .button-link, .button-secondary',
    )
  ) {
    return 'landing_cta_click';
  }

  return '';
}

function initAnalyticsEvents() {
  document.addEventListener('click', (event) => {
    const element = event.target.closest('a, button, [data-analytics-event]');
    if (!element || !window.WFAnalytics || !window.WFAnalytics.trackEvent) return;

    const eventName = element.dataset.analyticsEvent || inferredAnalyticsEvent(element);
    if (!eventName) return;

    window.WFAnalytics.trackEvent(eventName, analyticsPayload(element));
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form');
    if (!form || !window.WFAnalytics || !window.WFAnalytics.trackEvent) return;

    const eventName = form.dataset.analyticsEvent || inferredAnalyticsEvent(form);
    if (!eventName) return;

    window.WFAnalytics.trackEvent(eventName, analyticsPayload(form));
  });
}

const revealItems = document.querySelectorAll('.reveal');

if (revealItems.length > 0 && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('#site-nav');

if (navToggle && siteNav) {
  document.body.classList.add('has-js-nav');

  const setNavState = (isOpen) => {
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar navegación principal' : 'Abrir navegación principal');
    siteNav.classList.toggle('is-open', isOpen);
  };

  setNavState(false);

  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    setNavState(!isOpen);
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setNavState(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1120) {
      setNavState(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setNavState(false);
    }
  });
}

initUmamiAnalytics();
initAnalyticsEvents();

(() => {
  if (document.querySelector('script[data-personal-trainer-umami-bootstrap]')) return;
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.personalTrainerUmamiBootstrap = 'true';
  script.src = '/umami-analytics.js';
  document.head.appendChild(script);
})();

document.documentElement.classList.add('js');

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

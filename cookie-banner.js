(function () {
  const CONSENT_KEY = 'ptfuengirola-cookie-consent';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeLang(lang, copyByLang) {
    return copyByLang[lang] ? lang : 'es';
  }

  function readConsent() {
    return window.localStorage.getItem(CONSENT_KEY);
  }

  function shouldForcePreview() {
    const params = new URLSearchParams(window.location.search);
    return window.location.protocol === 'file:' || params.get('showCookies') === '1';
  }

  function writeConsent(value) {
    window.localStorage.setItem(CONSENT_KEY, value);
  }

  function renderPanel(copy, legalHref) {
    return `
      <div class="cookie-panel-backdrop" data-cookie-close></div>
      <section class="cookie-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.panelTitle)}">
        <div class="cookie-panel__header">
          <div>
            <p class="cookie-banner__eyebrow">${escapeHtml(copy.eyebrow)}</p>
            <h3>${escapeHtml(copy.panelTitle)}</h3>
          </div>
          <button type="button" class="cookie-panel__close" data-cookie-close aria-label="${escapeHtml(copy.close)}">×</button>
        </div>
        <p class="cookie-panel__intro">${escapeHtml(copy.panelBody)}</p>
        <div class="cookie-panel__option">
          <div>
            <strong>${escapeHtml(copy.necessaryTitle)}</strong>
            <p>${escapeHtml(copy.necessaryBody)}</p>
          </div>
          <span class="cookie-panel__badge">${escapeHtml(copy.alwaysOn)}</span>
        </div>
        <div class="cookie-panel__option">
          <div>
            <strong>${escapeHtml(copy.optionalTitle)}</strong>
            <p>${escapeHtml(copy.optionalBody)}</p>
          </div>
          <span class="cookie-panel__badge cookie-panel__badge--off">${escapeHtml(copy.offByDefault)}</span>
        </div>
        <div class="cookie-panel__footer">
          <a class="cookie-banner__link" href="${escapeHtml(legalHref)}">${escapeHtml(copy.more)}</a>
          <div class="cookie-panel__actions">
            <button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-action="necessary">${escapeHtml(copy.saveNecessary)}</button>
            <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-action="accept">${escapeHtml(copy.acceptAll)}</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderBanner(root, lang, copy, assetPath, legalHref) {
    root.innerHTML = `
      <aside class="cookie-banner" role="dialog" aria-live="polite" aria-label="${escapeHtml(copy.title)}">
        <div class="cookie-banner__media">
          <img src="${escapeHtml(assetPath)}" alt="${escapeHtml(copy.imageAlt)}" width="896" height="886" loading="eager" decoding="async">
        </div>
        <div class="cookie-banner__content">
          <p class="cookie-banner__eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2>${escapeHtml(copy.title)}</h2>
          <p>${escapeHtml(copy.body)}</p>
          <div class="cookie-banner__actions">
            <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-action="accept">${escapeHtml(copy.accept)}</button>
            <button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-action="panel">${escapeHtml(copy.configure)}</button>
            <a class="cookie-banner__link" href="${escapeHtml(legalHref)}">${escapeHtml(copy.more)}</a>
          </div>
        </div>
      </aside>
      <div class="cookie-panel-shell" hidden></div>
    `;
  }

  window.initCookieBanner = function initCookieBanner(options) {
    const {
      mountSelector = '#cookie-banner-root',
      initialLang = 'es',
      copyByLang,
      assetPath,
      legalHrefBuilder,
      onConsentChange,
    } = options;

    const root = document.querySelector(mountSelector);
    if (!root || !copyByLang || !assetPath || typeof legalHrefBuilder !== 'function') {
      return { setLang() {}, hide() {}, show() {} };
    }

    function hide() {
      root.hidden = true;
      root.innerHTML = '';
    }

    function show(lang) {
      const safeLang = normalizeLang(lang, copyByLang);
      const copy = copyByLang[safeLang];
      const legalHref = legalHrefBuilder(safeLang);
      root.hidden = false;
      renderBanner(root, safeLang, copy, assetPath, legalHref);

      const panelShell = root.querySelector('.cookie-panel-shell');

      function closePanel() {
        panelShell.hidden = true;
        panelShell.innerHTML = '';
      }

      function openPanel() {
        panelShell.hidden = false;
        panelShell.innerHTML = renderPanel(copy, legalHref);
        panelShell.querySelectorAll('[data-cookie-close]').forEach((element) => {
          element.addEventListener('click', closePanel);
        });

        panelShell.querySelector('[data-cookie-action="accept"]').addEventListener('click', () => {
          writeConsent('accepted');
          hide();
          if (typeof onConsentChange === 'function') onConsentChange('accepted');
        });

        panelShell.querySelector('[data-cookie-action="necessary"]').addEventListener('click', () => {
          writeConsent('necessary');
          hide();
          if (typeof onConsentChange === 'function') onConsentChange('necessary');
        });
      }

      root.querySelector('[data-cookie-action="accept"]').addEventListener('click', () => {
        writeConsent('accepted');
        hide();
        if (typeof onConsentChange === 'function') onConsentChange('accepted');
      });

      root.querySelector('[data-cookie-action="panel"]').addEventListener('click', openPanel);
    }

    function setLang(lang) {
      if (!shouldForcePreview() && readConsent()) {
        hide();
        return;
      }

      show(lang);
    }

    if (!shouldForcePreview() && readConsent()) {
      hide();
    } else {
      setLang(initialLang);
    }

    return { setLang, hide, show };
  };
})();

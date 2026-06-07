import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LOCALES,
  PAGE_CONTENT,
  ROUTES,
  SITE,
  STATIC_IMAGE_MAP,
  TOKEN_KEYS
} from "../content/site-data.js";
import { POSTS } from "../content/posts-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const buildDate = getBuildDate();
const publishedPosts = POSTS.filter((post) => post.publishAt <= buildDate).sort((a, b) =>
  a.publishAt.localeCompare(b.publishAt)
);

await cleanGeneratedPaths();
await ensureDir(path.join(rootDir, "assets", "images", "social"));
await Promise.all(Object.keys(LOCALES).map((locale) => writeSocialCard(locale)));

for (const locale of Object.keys(LOCALES)) {
  await writeHomePage(locale);
  await writeAboutPage(locale);
  await writeServicePage(locale);
  await writePricingPage(locale);
  await writeFaqPage(locale);
  await writeBlogIndexPage(locale);
}

for (const post of publishedPosts) {
  for (const locale of Object.keys(LOCALES)) {
    await writeArticlePage(locale, post);
  }
}

await writeRobots();
await writeSitemap();

async function cleanGeneratedPaths() {
  const removable = [
    "blog",
    "en",
    "fi",
    "sobre-sorvali",
    "servicios",
    "precios",
    "preguntas-frecuentes"
  ];

  await Promise.all(
    removable.map((target) =>
      fs.rm(path.join(rootDir, target), { recursive: true, force: true })
    )
  );
}

async function writeHomePage(locale) {
  const content = PAGE_CONTENT[locale].home;
  const featured = getPublishedPostsForLocale(locale).slice(-3).reverse();
  const actions = `
    <div class="hero-actions">
      <a class="button" href="${getTokenMap(locale).whatsAppGeneralUrl}" target="_blank" rel="noopener noreferrer">${content.heroPrimaryCta}</a>
      <a class="button-secondary" href="${ROUTES.service[locale]}">${content.heroSecondaryCta}</a>
    </div>
  `;

  const html = renderLayout({
    locale,
    pageKey: "home",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.home[locale],
    ogImage: socialImagePath(locale),
    schema: homeSchema(locale),
    breadcrumbs: null,
    mainClass: "page-shell",
    bodyContent: `
      <section class="hero-shell">
        <div class="hero">
          <div class="hero-copy reveal">
            <p class="eyebrow">${content.heroEyebrow}</p>
            <h1>${emphasizeLastPhrase(content.heroTitle)}</h1>
            <p class="lead">${content.heroLead}</p>
            ${actions}
            <div class="metrics" aria-label="${escapeHtml(content.heroEyebrow)}">
              ${content.metrics
                .map(
                  (metric) => `
                    <div class="metric">
                      <strong>${metric.value}</strong>
                      <span>${metric.label}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
          <figure class="image-frame-large reveal">
            <img src="${STATIC_IMAGE_MAP.homeHero}" alt="${escapeHtml(content.heroLead)}" width="1200" height="900">
            <figcaption class="caption">${content.heroCaption}</figcaption>
          </figure>
        </div>
      </section>

      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.introTitle}</h2>
          <div class="two-column">
            <div class="stack reveal">${replaceTokens(content.introHtml, getTokenMap(locale))}</div>
            <aside class="detail-card reveal">
              <span class="panel-kicker">${content.prioritiesTitle}</span>
              <h3>${content.prioritiesHeading}</h3>
              <ul class="check-list">
                ${content.priorities.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.methodologyTitle}</h2>
          <p class="section-intro reveal">${content.methodologyLead}</p>
          <div class="feature-grid">
            ${content.methodology
              .map(
                (item) => `
                  <article class="feature-card reveal">
                    <span>${item.number}</span>
                    <h3>${item.title}</h3>
                    <p>${item.text}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.galleryTitle}</h2>
          <div class="gallery-grid">
            ${content.gallery
              .map(
                (item) => `
                  <figure class="image-frame reveal">
                    <img src="${item.src}" alt="${item.alt}" width="1200" height="900" loading="lazy">
                    <figcaption class="caption">${item.caption}</figcaption>
                  </figure>
                `
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.audienceTitle}</h2>
          <div class="card-grid">
            ${content.audience
              .map(
                (card) => `
                  <article class="card reveal">
                    <h3>${card.title}</h3>
                    <p>${card.text}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-shell">
          <div class="section-heading">
            <h2 class="section-title reveal">${PAGE_CONTENT[locale].blog.cardsTitle}</h2>
            <a class="text-link" href="${ROUTES.blog[locale]}">${PAGE_CONTENT[locale].navigation.blog}</a>
          </div>
          ${renderBlogCards(featured, locale)}
        </div>
      </section>

      ${renderHighlightPanel({
        title: content.ctaTitle,
        text: content.ctaText,
        primaryLabel: content.ctaPrimary,
        primaryHref: getTokenMap(locale).whatsAppGeneralUrl,
        secondaryLabel: content.ctaSecondary,
        secondaryHref: ROUTES.blog[locale]
      })}
    `
  });

  await writeRouteFile(ROUTES.home[locale], html);
}

async function writeAboutPage(locale) {
  const content = PAGE_CONTENT[locale].about;
  const html = renderStandardPage({
    locale,
    pageKey: "about",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.about[locale],
    ogImage: socialImagePath(locale),
    schema: aboutSchema(locale),
    breadcrumbLabel: content.breadcrumb,
    heroEyebrow: content.heroEyebrow,
    heroTitle: emphasizeLastPhrase(content.heroTitle),
    heroLead: content.heroLead,
    heroImage: STATIC_IMAGE_MAP.aboutHero,
    heroImageAlt: content.heroTitle,
    heroCaption: content.heroCaption,
    bodyContent: `
      ${replaceTokens(content.mainHtml, getTokenMap(locale))}
      ${renderHighlightPanel({
        title: content.ctaTitle,
        text: content.ctaText,
        primaryLabel: content.ctaPrimary,
        primaryHref: getTokenMap(locale).whatsAppAboutUrl,
        secondaryLabel: content.ctaSecondary,
        secondaryHref: ROUTES.service[locale]
      })}
    `
  });

  await writeRouteFile(ROUTES.about[locale], html);
}

async function writeServicePage(locale) {
  const content = PAGE_CONTENT[locale].service;
  const html = renderStandardPage({
    locale,
    pageKey: "service",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.service[locale],
    ogImage: socialImagePath(locale),
    schema: serviceSchema(locale),
    breadcrumbLabel: content.breadcrumb,
    heroEyebrow: content.heroEyebrow,
    heroTitle: emphasizeLastPhrase(content.heroTitle),
    heroLead: content.heroLead,
    heroImage: STATIC_IMAGE_MAP.serviceHero,
    heroImageAlt: content.heroTitle,
    heroCaption: content.heroCaption,
    heroActions: `
      <div class="button-row">
        <a class="button" href="${getTokenMap(locale).whatsAppServiceUrl}" target="_blank" rel="noopener noreferrer">${content.heroPrimary}</a>
        <a class="button-secondary" href="${ROUTES.pricing[locale]}">${content.heroSecondary}</a>
      </div>
    `,
    bodyContent: `
      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.includesTitle}</h2>
          <div class="price-grid">
            ${content.includes
              .map(
                (item) => `
                  <article class="price-card reveal">
                    <span class="price-label">${item.label}</span>
                    <h3>${item.title}</h3>
                    <p>${item.text}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-shell">
          <div class="two-column">
            <div class="stack reveal">${replaceTokens(content.supportHtml, getTokenMap(locale))}</div>
            <aside class="detail-card reveal">
              <h2>${locale === "es" ? "Objetivos habituales" : locale === "en" ? "Common goals" : "Tyypilliset tavoitteet"}</h2>
              <ul class="check-list">${content.goals.map((item) => `<li>${item}</li>`).join("")}</ul>
            </aside>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-shell">
          <div class="two-column visual-pair">
            <figure class="image-frame reveal">
              <img src="${STATIC_IMAGE_MAP.serviceSupportOne}" alt="${escapeHtml(content.heroTitle)}" width="1200" height="900" loading="lazy">
              <figcaption class="caption">${locale === "es" ? "La técnica es parte del resultado, no un detalle secundario." : locale === "en" ? "Technique is part of the result, not a side detail." : "Tekniikka on osa lopputulosta, ei sivuseikka."}</figcaption>
            </figure>
            <figure class="image-frame reveal">
              <img src="${STATIC_IMAGE_MAP.serviceSupportTwo}" alt="${escapeHtml(content.heroLead)}" width="1200" height="900" loading="lazy">
              <figcaption class="caption">${locale === "es" ? "Un entorno que refuerza el tono profesional y local del servicio." : locale === "en" ? "An environment that supports the service's local professional tone." : "Ympäristö, joka tukee palvelun paikallista ja ammattimaista otetta."}</figcaption>
            </figure>
          </div>
        </div>
      </section>
      ${renderProcessPanel(content, locale)}
    `
  });

  await writeRouteFile(ROUTES.service[locale], html);
}

async function writePricingPage(locale) {
  const content = PAGE_CONTENT[locale].pricing;
  const html = renderLayout({
    locale,
    pageKey: "pricing",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.pricing[locale],
    ogImage: socialImagePath(locale),
    schema: pricingSchema(locale),
    breadcrumbs: renderBreadcrumbs(locale, content.breadcrumb),
    mainClass: "page-shell",
    bodyContent: `
      <section class="page-hero">
        <div class="page-hero-copy reveal">
          <p class="eyebrow">${content.heroEyebrow}</p>
          <h1>${emphasizeLastPhrase(content.heroTitle)}</h1>
          <p class="lead">${content.heroLead}</p>
        </div>
        <div class="price-card price-card-featured reveal">
          <span class="price-label">${content.priceLabel}</span>
          <strong class="price-number">${content.priceValue}</strong>
          <p>${content.priceText}</p>
          <p class="subtle-note">${content.priceNote}</p>
          <div class="button-row">
            <a class="button" href="${getTokenMap(locale).whatsAppPricingUrl}" target="_blank" rel="noopener noreferrer">${content.priceButton}</a>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${locale === "es" ? "Qué estás pagando" : locale === "en" ? "What you are paying for" : "Mistä maksat"}</h2>
          <div class="three-column">
            ${content.columns
              .map(
                (item) => `
                  <article class="card reveal">
                    <h3>${item.title}</h3>
                    <p>${item.text}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-shell">
          <div class="two-column">
            <div class="stack reveal">${replaceTokens(content.supportHtml, getTokenMap(locale))}</div>
            <figure class="image-frame reveal">
              <img src="${STATIC_IMAGE_MAP.pricingSupport}" alt="${escapeHtml(content.heroTitle)}" width="1200" height="900" loading="lazy">
              <figcaption class="caption">${locale === "es" ? "Precio claro y proceso claro: ambas cosas importan." : locale === "en" ? "Clear pricing and a clear process both matter." : "Selkeä hinta ja selkeä prosessi kuuluvat yhteen."}</figcaption>
            </figure>
          </div>
        </div>
      </section>
      ${renderHighlightPanel({
        title: content.ctaTitle,
        text: content.ctaText,
        primaryLabel: content.ctaPrimary,
        primaryHref: getTokenMap(locale).whatsAppPricingUrl,
        secondaryLabel: content.ctaSecondary,
        secondaryHref: ROUTES.faq[locale]
      })}
    `
  });

  await writeRouteFile(ROUTES.pricing[locale], html);
}

async function writeFaqPage(locale) {
  const content = PAGE_CONTENT[locale].faq;
  const html = renderStandardPage({
    locale,
    pageKey: "faq",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.faq[locale],
    ogImage: socialImagePath(locale),
    schema: faqSchema(locale, content.questions),
    breadcrumbLabel: content.breadcrumb,
    heroEyebrow: content.heroEyebrow,
    heroTitle: emphasizeLastPhrase(content.heroTitle),
    heroLead: content.heroLead,
    heroImage: STATIC_IMAGE_MAP.faqHero,
    heroImageAlt: content.heroTitle,
    heroCaption: content.heroCaption,
    bodyContent: `
      <section class="section">
        <div class="section-shell">
          <div class="faq-list">
            ${content.questions
              .map(
                (item, index) => `
                  <details class="faq-item reveal" ${index === 0 ? "open" : ""}>
                    <summary>${item.q}</summary>
                    <div class="faq-answer"><p>${item.a}</p></div>
                  </details>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
      ${renderHighlightPanel({
        title: content.ctaTitle,
        text: content.ctaText,
        primaryLabel: content.ctaPrimary,
        primaryHref: getTokenMap(locale).whatsAppFaqUrl,
        secondaryLabel: content.ctaSecondary,
        secondaryHref: ROUTES.service[locale]
      })}
    `
  });

  await writeRouteFile(ROUTES.faq[locale], html);
}

async function writeBlogIndexPage(locale) {
  const content = PAGE_CONTENT[locale].blog;
  const posts = getPublishedPostsForLocale(locale).slice().reverse();
  const html = renderStandardPage({
    locale,
    pageKey: "blog",
    title: content.metaTitle,
    description: content.metaDescription,
    ogDescription: content.ogDescription,
    canonicalPath: ROUTES.blog[locale],
    ogImage: socialImagePath(locale),
    schema: blogSchema(locale),
    breadcrumbLabel: content.breadcrumb,
    heroEyebrow: content.heroEyebrow,
    heroTitle: emphasizeLastPhrase(content.heroTitle),
    heroLead: content.heroLead,
    heroImage: STATIC_IMAGE_MAP.blogHero,
    heroImageAlt: content.heroTitle,
    heroCaption: content.heroCaption,
    bodyContent: `
      <section class="section">
        <div class="section-shell">
          <h2 class="section-title reveal">${content.cardsTitle}</h2>
          ${renderBlogCards(posts, locale)}
        </div>
      </section>
      ${renderHighlightPanel({
        title: content.ctaTitle,
        text: content.ctaText,
        primaryLabel: content.ctaPrimary,
        primaryHref: getTokenMap(locale).whatsAppBlogUrl,
        secondaryLabel: content.ctaSecondary,
        secondaryHref: ROUTES.service[locale]
      })}
    `
  });

  await writeRouteFile(ROUTES.blog[locale], html);
}

async function writeArticlePage(locale, post) {
  const translation = post.translations[locale];
  const route = articleRoute(locale, post);
  const articleTokens = getTokenMap(locale);
  const bodyHtml = replaceTokens(
    translation.bodyHtml.replace("{{inlineImage}}", renderInlineArticleImage(translation, post)),
    articleTokens
  );
  const articleDate = formatDate(post.publishAt, locale);
  const related = getPublishedPostsForLocale(locale)
    .filter((candidate) => candidate.id !== post.id)
    .filter((candidate) => candidate.cluster === post.cluster || candidate.isLocal === post.isLocal)
    .slice(-3)
    .reverse();

  const faqSection =
    translation.faq.length > 0
      ? `
        <section class="section article-section">
          <div class="section-shell">
            <h2 class="section-title">${locale === "es" ? "Preguntas rápidas" : locale === "en" ? "Quick questions" : "Nopeat kysymykset"}</h2>
            <div class="faq-list faq-compact">
              ${translation.faq
                .map(
                  (item, index) => `
                    <details class="faq-item" ${index === 0 ? "open" : ""}>
                      <summary>${item.q}</summary>
                      <div class="faq-answer"><p>${item.a}</p></div>
                    </details>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>
      `
      : "";

  const relatedSection =
    related.length > 0
      ? `
        <section class="section article-section">
          <div class="section-shell">
            <div class="section-heading">
              <h2 class="section-title">${locale === "es" ? "Artículos relacionados" : locale === "en" ? "Related articles" : "Aiheeseen liittyvät artikkelit"}</h2>
              <a class="text-link" href="${ROUTES.blog[locale]}">${PAGE_CONTENT[locale].navigation.blog}</a>
            </div>
            ${renderBlogCards(related, locale)}
          </div>
        </section>
      `
      : "";

  const html = renderLayout({
    locale,
    pageKey: "blog",
    title: translation.metaTitle,
    description: translation.metaDescription,
    ogDescription: translation.excerpt,
    canonicalPath: route,
    ogType: "article",
    ogImage: post.coverImage,
    schema: articleSchema(locale, post),
    breadcrumbs: renderArticleBreadcrumbs(locale, translation.title),
    mainClass: "article-shell",
    bodyContent: `
      <p class="eyebrow">${translation.category}</p>
      <h1>${translation.title}</h1>
      <div class="article-meta">
        <span>${locale === "es" ? "Publicado" : locale === "en" ? "Published" : "Julkaistu"}: ${articleDate}</span>
        <span>${locale === "es" ? "Autor" : locale === "en" ? "Author" : "Tekijä"}: ${SITE.shortBrand}</span>
        <span>${locale === "es" ? "Tema" : locale === "en" ? "Topic" : "Teema"}: ${translation.category}</span>
      </div>
      <figure class="image-frame-large article-hero-image">
        <img src="${post.coverImage}" alt="${translation.imageAlt}" width="1600" height="900" fetchpriority="high">
        <figcaption class="caption">${translation.heroCaption}</figcaption>
      </figure>
      <div class="article-body">
        ${bodyHtml}
      </div>
      <section class="section article-section">
        <div class="section-shell">
          <div class="cta-box">
            <h2>${getArticleCtaTitle(locale)}</h2>
            <p>${getArticleCtaText(locale, post)}</p>
            <div class="button-row">
              <a class="button" href="${getTokenMap(locale).whatsAppBlogUrl}" target="_blank" rel="noopener noreferrer">${locale === "es" ? "Escribir por WhatsApp" : locale === "en" ? "Message on WhatsApp" : "Lähetä WhatsApp-viesti"}</a>
              <a class="button-secondary" href="${ROUTES.service[locale]}">${PAGE_CONTENT[locale].navigation.service}</a>
            </div>
          </div>
        </div>
      </section>
      ${faqSection}
      ${relatedSection}
    `
  });

  await writeRouteFile(route, html);
}

function renderStandardPage({
  locale,
  pageKey,
  title,
  description,
  ogDescription,
  canonicalPath,
  ogImage,
  schema,
  breadcrumbLabel,
  heroEyebrow,
  heroTitle,
  heroLead,
  heroImage,
  heroImageAlt,
  heroCaption,
  heroActions = "",
  bodyContent
}) {
  return renderLayout({
    locale,
    pageKey,
    title,
    description,
    ogDescription,
    canonicalPath,
    ogImage,
    schema,
    breadcrumbs: renderBreadcrumbs(locale, breadcrumbLabel),
    mainClass: "page-shell",
    bodyContent: `
      <section class="page-hero">
        <div class="page-hero-copy reveal">
          <p class="eyebrow">${heroEyebrow}</p>
          <h1>${heroTitle}</h1>
          <p class="lead">${heroLead}</p>
          ${heroActions}
        </div>
        <figure class="image-frame-large reveal">
          <img src="${heroImage}" alt="${heroImageAlt}" width="1200" height="900">
          <figcaption class="caption">${heroCaption}</figcaption>
        </figure>
      </section>
      ${bodyContent}
    `
  });
}

function renderLayout({
  locale,
  pageKey,
  title,
  description,
  ogDescription,
  canonicalPath,
  ogImage,
  schema,
  bodyContent,
  breadcrumbs,
  mainClass = "page-shell",
  ogType = "website"
}) {
  const alternates = alternateLinks(locale, canonicalPath);
  const tokenMap = getTokenMap(locale);
  const localeInfo = LOCALES[locale];

  return `<!DOCTYPE html>
<html lang="${localeInfo.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${absoluteUrl(canonicalPath)}">
  ${alternates}
  <meta property="og:type" content="${ogType}">
  <meta property="og:locale" content="${localeInfo.ogLocale}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:url" content="${absoluteUrl(canonicalPath)}">
  <meta property="og:image" content="${absoluteUrl(ogImage)}">
  <meta property="og:image:alt" content="${description}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${absoluteUrl(ogImage)}">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="${ROUTES.home[locale]}" class="logo-wrap" aria-label="${PAGE_CONTENT[locale].navigation.homeAriaLabel}">
        <span class="logo-mark">PT</span>
        <span class="logo-name">
          <span class="logo-main">Personal Trainer</span>
          <span class="logo-sub">Fuengirola · Sorvali</span>
        </span>
      </a>
      <div class="header-actions">
        <nav class="site-nav" aria-label="${PAGE_CONTENT[locale].navigation.openMenuLabel}">
          ${renderNavigation(locale, pageKey)}
        </nav>
        <div class="lang-switcher" aria-label="Language switcher">
          ${renderLanguageSwitcher(canonicalPath, locale)}
        </div>
      </div>
    </div>
  </header>
  <main class="${mainClass}">
    ${breadcrumbs || ""}
    ${bodyContent}
  </main>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">${SITE.brand}</div>
        <div class="footer-links">
          <a href="${ROUTES.home[locale]}">${PAGE_CONTENT[locale].navigation.home}</a>
          <a href="${ROUTES.about[locale]}">${PAGE_CONTENT[locale].navigation.about}</a>
          <a href="${ROUTES.service[locale]}">${PAGE_CONTENT[locale].navigation.service}</a>
          <a href="${ROUTES.pricing[locale]}">${PAGE_CONTENT[locale].navigation.pricing}</a>
          <a href="${ROUTES.faq[locale]}">${PAGE_CONTENT[locale].navigation.faq}</a>
          <a href="${ROUTES.blog[locale]}">${PAGE_CONTENT[locale].navigation.blog}</a>
          <a href="${ROUTES.legal[locale]}">${PAGE_CONTENT[locale].footer.legal}</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>WhatsApp: <a href="${tokenMap.whatsAppGeneralUrl}" target="_blank" rel="noopener noreferrer">${SITE.phone}</a></span>
        <span>© <span data-year>${new Date(buildDate).getUTCFullYear()}</span> · ${PAGE_CONTENT[locale].footer.developedBy} <a href="https://webfuengirola.com" target="_blank" rel="noopener noreferrer">Web Fuengirola Studio</a></span>
      </div>
      <p class="footer-note">${PAGE_CONTENT[locale].footer.languageNote}</p>
    </div>
  </footer>
  <script src="/site.js" defer></script>
</body>
</html>`;
}

function renderNavigation(locale, currentPage) {
  const nav = PAGE_CONTENT[locale].navigation;
  return [
    ["home", ROUTES.home[locale], nav.home],
    ["about", ROUTES.about[locale], nav.about],
    ["service", ROUTES.service[locale], nav.service],
    ["pricing", ROUTES.pricing[locale], nav.pricing],
    ["faq", ROUTES.faq[locale], nav.faq],
    ["blog", ROUTES.blog[locale], nav.blog],
    ["legal", ROUTES.legal[locale], nav.legal]
  ]
    .map(
      ([key, href, label]) =>
        `<a href="${href}" ${key === currentPage ? 'aria-current="page"' : ""}>${label}</a>`
    )
    .join("");
}

function renderLanguageSwitcher(currentPath, currentLocale) {
  const key = routeLookupKey(currentPath);
  if (key?.type === "page") {
    return Object.keys(LOCALES)
      .map((locale) => {
        const href = ROUTES[key.key][locale] || ROUTES[key.key].es;
        return `<a href="${href}" ${locale === currentLocale ? 'aria-current="true"' : ""}>${LOCALES[locale].label}</a>`;
      })
      .join("");
  }

  if (key?.type === "article") {
    const post = POSTS.find((item) => item.id === key.key);
    return Object.keys(LOCALES)
      .map((locale) => {
        const href = articleRoute(locale, post);
        return `<a href="${href}" ${locale === currentLocale ? 'aria-current="true"' : ""}>${LOCALES[locale].label}</a>`;
      })
      .join("");
  }

  return "";
}

function renderBlogCards(posts, locale) {
  if (posts.length === 0) {
    return `<div class="empty-state reveal"><p>${
      locale === "es"
        ? "El primer artículo programado aparecerá automáticamente en cuanto llegue su fecha de publicación."
        : locale === "en"
          ? "The first scheduled article will appear automatically as soon as its publish date arrives."
          : "Ensimmäinen ajastettu artikkeli ilmestyy automaattisesti julkaisupäivän koittaessa."
    }</p></div>`;
  }

  return `<div class="blog-grid">
    ${posts
      .map((post) => {
        const translation = post.translations[locale];
        return `
          <article class="blog-card reveal">
            <a class="blog-card-media" href="${articleRoute(locale, post)}">
              <img src="${post.coverImage}" alt="${translation.imageAlt}" width="1600" height="900" loading="lazy">
            </a>
            <div class="blog-card-copy">
              <span class="tag">${translation.category}</span>
              <p class="post-date">${formatDate(post.publishAt, locale)}</p>
              <h3><a href="${articleRoute(locale, post)}">${translation.title}</a></h3>
              <p>${translation.excerpt}</p>
            </div>
          </article>
        `;
      })
      .join("")}
  </div>`;
}

function renderHighlightPanel({ title, text, primaryLabel, primaryHref, secondaryLabel, secondaryHref }) {
  return `
    <section class="section">
      <div class="section-shell">
        <div class="highlight-panel reveal">
          <h2 class="section-title">${title}</h2>
          <p class="section-intro">${text}</p>
          <div class="button-row">
            <a class="button" href="${primaryHref}" target="_blank" rel="noopener noreferrer">${primaryLabel}</a>
            <a class="button-secondary" href="${secondaryHref}">${secondaryLabel}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProcessPanel(content, locale) {
  return `
    <section class="section">
      <div class="section-shell">
        <div class="highlight-panel reveal">
          <h2 class="section-title">${content.ctaTitle}</h2>
          <p class="section-intro">${content.ctaText}</p>
          <ol class="timeline">
            ${content.steps.map((step) => `<li>${step}</li>`).join("")}
          </ol>
          <div class="button-row">
            <a class="button" href="${getTokenMap(locale).whatsAppServiceUrl}" target="_blank" rel="noopener noreferrer">${content.ctaPrimary}</a>
            <a class="button-secondary" href="${ROUTES.faq[locale]}">${content.ctaSecondary}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderBreadcrumbs(locale, label) {
  return `<p class="breadcrumbs"><a href="${ROUTES.home[locale]}">${PAGE_CONTENT[locale].navigation.home}</a> / ${label}</p>`;
}

function renderArticleBreadcrumbs(locale, label) {
  return `<p class="breadcrumbs"><a href="${ROUTES.home[locale]}">${PAGE_CONTENT[locale].navigation.home}</a> / <a href="${ROUTES.blog[locale]}">${PAGE_CONTENT[locale].navigation.blog}</a> / ${label}</p>`;
}

function renderInlineArticleImage(translation, post) {
  return `
    <figure class="image-frame article-inline-figure">
      <img src="${post.inlineImage}" alt="${translation.imageAlt}" width="1600" height="900" loading="lazy">
      <figcaption class="caption">${translation.inlineCaption}</figcaption>
    </figure>
  `;
}

function getPublishedPostsForLocale(locale) {
  return publishedPosts.map((post) => ({
    ...post,
    translation: post.translations[locale]
  }));
}

function getTokenMap(locale) {
  const pageTexts = {
    es: {
      general: "Hola Sorvali, he visto tu web y quiero más información sobre entrenamiento personal en Fuengirola.",
      service: "Hola Sorvali, quiero información sobre tu servicio de entrenamiento personal en Fuengirola.",
      about: "Hola Sorvali, quiero conocer mejor tu forma de trabajar como entrenadora personal en Fuengirola.",
      pricing: "Hola Sorvali, he visto el precio y quiero consultar disponibilidad.",
      faq: "Hola Sorvali, tengo una duda sobre tu servicio de entrenamiento personal.",
      blog: "Hola Sorvali, he leído tu blog y quiero ayuda para empezar a entrenar en Fuengirola."
    },
    en: {
      general: "Hello Sorvali, I found your website and would like more information about personal training in Fuengirola.",
      service: "Hello Sorvali, I would like information about your personal training service in Fuengirola.",
      about: "Hello Sorvali, I would like to know more about how you work as a personal trainer in Fuengirola.",
      pricing: "Hello Sorvali, I saw the session price and would like to check availability.",
      faq: "Hello Sorvali, I have a question about your personal training service.",
      blog: "Hello Sorvali, I read your blog and would like help getting started with training in Fuengirola."
    },
    fi: {
      general: "Hei Sorvali, löysin sivustosi ja haluaisin lisätietoa personal training -palvelusta Fuengirolassa.",
      service: "Hei Sorvali, haluaisin lisätietoa personal training -palvelustasi Fuengirolassa.",
      about: "Hei Sorvali, haluaisin tietää lisää tavastasi työskennellä personal trainerina Fuengirolassa.",
      pricing: "Hei Sorvali, näin hinnan ja haluaisin kysyä vapaita aikoja.",
      faq: "Hei Sorvali, minulla on kysymys personal training -palvelustasi.",
      blog: "Hei Sorvali, luin blogiasi ja haluaisin apua treenaamisen aloittamiseen Fuengirolassa."
    }
  }[locale];

  return {
    homeUrl: ROUTES.home[locale],
    aboutUrl: ROUTES.about[locale],
    serviceUrl: ROUTES.service[locale],
    pricingUrl: ROUTES.pricing[locale],
    faqUrl: ROUTES.faq[locale],
    blogUrl: ROUTES.blog[locale],
    legalUrl: ROUTES.legal[locale],
    whatsAppGeneralUrl: buildWhatsAppUrl(pageTexts.general),
    whatsAppServiceUrl: buildWhatsAppUrl(pageTexts.service),
    whatsAppAboutUrl: buildWhatsAppUrl(pageTexts.about),
    whatsAppPricingUrl: buildWhatsAppUrl(pageTexts.pricing),
    whatsAppFaqUrl: buildWhatsAppUrl(pageTexts.faq),
    whatsAppBlogUrl: buildWhatsAppUrl(pageTexts.blog)
  };
}

function replaceTokens(input, tokens) {
  let output = input;
  for (const key of TOKEN_KEYS) {
    output = output.replaceAll(`{{${key}}}`, tokens[key]);
  }
  return output;
}

function buildWhatsAppUrl(text) {
  return `https://api.whatsapp.com/send/?phone=${SITE.whatsappNumber}&text=${encodeURIComponent(text)}`;
}

function alternateLinks(locale, currentPath) {
  const key = routeLookupKey(currentPath);
  if (!key) {
    return "";
  }

  const links = [];
  if (key.type === "page") {
    for (const targetLocale of Object.keys(LOCALES)) {
      const href = ROUTES[key.key][targetLocale];
      if (href) {
        links.push(
          `<link rel="alternate" hreflang="${LOCALES[targetLocale].hreflang}" href="${absoluteUrl(href)}">`
        );
      }
    }
    links.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(ROUTES[key.key].es)}">`);
  } else if (key.type === "article") {
    const post = POSTS.find((item) => item.id === key.key);
    for (const targetLocale of Object.keys(LOCALES)) {
      links.push(
        `<link rel="alternate" hreflang="${LOCALES[targetLocale].hreflang}" href="${absoluteUrl(
          articleRoute(targetLocale, post)
        )}">`
      );
    }
    links.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(articleRoute("es", post))}">`);
  }

  return links.join("\n  ");
}

function routeLookupKey(currentPath) {
  for (const [pageKey, locales] of Object.entries(ROUTES)) {
    for (const locale of Object.keys(LOCALES)) {
      if (locales[locale] === currentPath) {
        return { type: "page", key: pageKey };
      }
    }
  }

  for (const post of POSTS) {
    for (const locale of Object.keys(LOCALES)) {
      if (articleRoute(locale, post) === currentPath) {
        return { type: "article", key: post.id };
      }
    }
  }

  return null;
}

function articleRoute(locale, post) {
  return `${ROUTES.blog[locale]}${post.translations[locale].slug}/`;
}

function socialImagePath(locale) {
  return `/assets/images/social/share-${locale}.svg`;
}

async function writeSocialCard(locale) {
  const filePath = path.join(rootDir, "assets", "images", "social", `share-${locale}.svg`);
  const title =
    locale === "es"
      ? "Entrena con criterio en Fuengirola"
      : locale === "en"
        ? "Train with clarity in Fuengirola"
        : "Treenaa selkeammin Fuengirolassa";
  const subtitle =
    locale === "es"
      ? "Sorvali · fuerza, hábitos y guía local"
      : locale === "en"
        ? "Sorvali · strength, habits and local guidance"
        : "Sorvali · voima, tavat ja paikallinen ohjaus";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(subtitle)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f5f1e8"/>
      <stop offset="100%" stop-color="#d7e2ea"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1020" cy="126" r="140" fill="#153042" opacity="0.08"/>
  <circle cx="180" cy="520" r="150" fill="#c89d51" opacity="0.18"/>
  <rect x="90" y="86" width="164" height="164" rx="32" fill="#153042"/>
  <text x="172" y="188" font-size="84" text-anchor="middle" font-family="'Avenir Next', 'Helvetica Neue', Arial, sans-serif" fill="#f5f1e8" font-weight="700">PT</text>
  <text x="90" y="334" font-size="66" font-family="'Avenir Next Condensed', 'Arial Narrow', sans-serif" fill="#153042" font-weight="700">${escapeXml(title)}</text>
  <text x="90" y="402" font-size="30" font-family="'Avenir Next', 'Helvetica Neue', Arial, sans-serif" fill="#345167">${escapeXml(subtitle)}</text>
  <text x="90" y="514" font-size="22" font-family="'Avenir Next', 'Helvetica Neue', Arial, sans-serif" fill="#153042">personaltrainerfuengirola.com</text>
  <rect x="90" y="545" width="248" height="18" rx="9" fill="#c89d51"/>
</svg>`;
  await fs.writeFile(filePath, svg, "utf8");
}

async function writeRobots() {
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE.domain}/sitemap.xml\n`;
  await fs.writeFile(path.join(rootDir, "robots.txt"), robots, "utf8");
}

async function writeSitemap() {
  const entries = [];
  const staticRoutes = [
    "home",
    "about",
    "service",
    "pricing",
    "faq",
    "blog"
  ];

  for (const pageKey of staticRoutes) {
    for (const locale of Object.keys(LOCALES)) {
      entries.push({
        loc: absoluteUrl(ROUTES[pageKey][locale]),
        lastmod: buildDate,
        alternates: Object.keys(LOCALES).map((targetLocale) => ({
          hreflang: LOCALES[targetLocale].hreflang,
          href: absoluteUrl(ROUTES[pageKey][targetLocale])
        }))
      });
    }
  }

  entries.push({
    loc: absoluteUrl(ROUTES.legal.es),
    lastmod: buildDate,
    alternates: [{ hreflang: LOCALES.es.hreflang, href: absoluteUrl(ROUTES.legal.es) }]
  });

  for (const post of publishedPosts) {
    for (const locale of Object.keys(LOCALES)) {
      entries.push({
        loc: absoluteUrl(articleRoute(locale, post)),
        lastmod: post.publishAt,
        alternates: Object.keys(LOCALES).map((targetLocale) => ({
          hreflang: LOCALES[targetLocale].hreflang,
          href: absoluteUrl(articleRoute(targetLocale, post))
        }))
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
${entry.alternates
  .map(
    (alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`
  )
  .join("\n")}
  </url>`
  )
  .join("\n")}
</urlset>
`;

  await fs.writeFile(path.join(rootDir, "sitemap.xml"), xml, "utf8");
}

async function writeRouteFile(routePath, html) {
  const filePath =
    routePath === "/"
      ? path.join(rootDir, "index.html")
      : path.join(rootDir, routePath.replace(/^\/+/, ""), "index.html");
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html, "utf8");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function absoluteUrl(routePath) {
  return `${SITE.domain}${routePath}`;
}

function emphasizeLastPhrase(title) {
  const split = title.lastIndexOf(" ");
  if (split === -1) {
    return title;
  }
  return `${escapeHtml(title.slice(0, split))} <span>${escapeHtml(title.slice(split + 1))}</span>`;
}

function getBuildDate() {
  const argDate = process.argv.find((arg) => arg.startsWith("--date="));
  if (argDate) {
    return validateDateInput(argDate.replace("--date=", ""));
  }

  const bareDateFlagIndex = process.argv.indexOf("--date");
  if (bareDateFlagIndex !== -1) {
    const nextValue = process.argv[bareDateFlagIndex + 1];
    return validateDateInput(nextValue);
  }

  if (process.env.BUILD_DATE) {
    return validateDateInput(process.env.BUILD_DATE);
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function validateDateInput(dateValue) {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error(`Invalid build date "${dateValue}". Use YYYY-MM-DD.`);
  }
  return dateValue;
}

function formatDate(dateString, locale) {
  const localeMap = { es: "es-ES", en: "en-GB", fi: "fi-FI" };
  return new Intl.DateTimeFormat(localeMap[locale], {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${dateString}T09:00:00+02:00`));
}

function homeSchema(locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE.brand,
        url: absoluteUrl(ROUTES.home[locale]),
        inLanguage: LOCALES[locale].hreflang
      },
      {
        "@type": "Person",
        name: "Sofia Sorvali",
        jobTitle: locale === "es" ? "Entrenadora personal" : locale === "en" ? "Personal trainer" : "Personal trainer",
        description:
          locale === "es"
            ? "Entrenadora personal en Fuengirola especializada en fuerza, acondicionamiento físico y transformación corporal."
            : locale === "en"
              ? "Personal trainer in Fuengirola focused on strength, conditioning and body recomposition."
              : "Fuengirolassa toimiva personal trainer, jonka fokus on voimassa, kuntoharjoittelussa ja kehonkoostumuksessa.",
        telephone: SITE.phone,
        email: SITE.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: SITE.locality,
          addressRegion: SITE.region,
          addressCountry: SITE.country
        }
      },
      {
        "@type": "Service",
        name:
          locale === "es"
            ? "Entrenamiento personal en Fuengirola"
            : locale === "en"
              ? "Personal training in Fuengirola"
              : "Personal training Fuengirolassa",
        serviceType:
          locale === "es"
            ? "Entrenamiento personal 1 a 1"
            : locale === "en"
              ? "One-to-one personal training"
              : "Yksiloohjattu personal training",
        provider: {
          "@type": "Person",
          name: "Sofia Sorvali"
        },
        areaServed: {
          "@type": "City",
          name: SITE.locality
        },
        offers: {
          "@type": "Offer",
          price: "50",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock"
        }
      }
    ]
  };
}

function aboutSchema(locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Sofia Sorvali",
    jobTitle: locale === "es" ? "Entrenadora personal" : "Personal trainer",
    telephone: SITE.phone,
    email: SITE.email,
    url: absoluteUrl(ROUTES.about[locale]),
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.locality,
      addressRegion: SITE.region,
      addressCountry: SITE.country
    }
  };
}

function serviceSchema(locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name:
      locale === "es"
        ? "Entrenamiento personal en Fuengirola"
        : locale === "en"
          ? "Personal training in Fuengirola"
          : "Personal training Fuengirolassa",
    description: PAGE_CONTENT[locale].service.metaDescription,
    serviceType:
      locale === "es"
        ? "Entrenamiento personal"
        : locale === "en"
          ? "Personal training"
          : "Personal training",
    areaServed: {
      "@type": "City",
      name: SITE.locality
    },
    provider: {
      "@type": "Person",
      name: "Sofia Sorvali"
    },
    offers: {
      "@type": "Offer",
      price: "50",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(ROUTES.service[locale])
    }
  };
}

function pricingSchema(locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name:
      locale === "es"
        ? "Sesión individual de entrenamiento personal"
        : locale === "en"
          ? "One-to-one personal training session"
          : "Yksiloohjattu personal training -harjoitus",
    price: "50",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    itemOffered: {
      "@type": "Service",
      name:
        locale === "es"
          ? "Entrenamiento personal en Fuengirola"
          : locale === "en"
            ? "Personal training in Fuengirola"
            : "Personal training Fuengirolassa"
    },
    url: absoluteUrl(ROUTES.pricing[locale])
  };
}

function faqSchema(locale, questions) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}

function blogSchema(locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name:
      locale === "es"
        ? "Blog de Personal Trainer Fuengirola - Sorvali"
        : locale === "en"
          ? "Fuengirola Personal Training Blog - Sorvali"
          : "Fuengirolan personal training -blogi - Sorvali",
    url: absoluteUrl(ROUTES.blog[locale]),
    inLanguage: LOCALES[locale].hreflang,
    publisher: {
      "@type": "Organization",
      name: SITE.brand
    }
  };
}

function articleSchema(locale, post) {
  const translation = post.translations[locale];
  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: translation.title,
      description: translation.metaDescription,
      inLanguage: LOCALES[locale].hreflang,
      datePublished: post.publishAt,
      dateModified: post.publishAt,
      author: {
        "@type": "Person",
        name: "Sofia Sorvali"
      },
      publisher: {
        "@type": "Organization",
        name: SITE.brand
      },
      image: {
        "@type": "ImageObject",
        url: absoluteUrl(post.coverImage)
      },
      url: absoluteUrl(articleRoute(locale, post))
    }
  ];

  if (translation.faq.length > 0) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: translation.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a
        }
      }))
    });
  }

  return graph.length === 1 ? graph[0] : { "@context": "https://schema.org", "@graph": graph.map((item) => ({ ...item, "@context": undefined })) };
}

function getArticleCtaTitle(locale) {
  if (locale === "es") {
    return "Si quieres llevar esta idea a tu caso real, lo siguiente es hablarlo";
  }
  if (locale === "en") {
    return "If you want to turn this idea into a real plan, the next step is a direct conversation";
  }
  return "Jos haluat muuttaa tämän idean oikeaksi suunnitelmaksi, seuraava askel on suora keskustelu";
}

function getArticleCtaText(locale, post) {
  if (locale === "es") {
    return `Este artículo forma parte del blog local de ${SITE.shortBrand}. Si quieres empezar con estructura en Fuengirola, se puede valorar tu punto de partida y ver si el servicio encaja contigo.`;
  }
  if (locale === "en") {
    return `This article is part of ${SITE.shortBrand}'s local blog. If you want a more structured start in Fuengirola, your current level and next step can be reviewed directly.`;
  }
  return `Tämä artikkeli kuuluu ${SITE.shortBrand}n paikalliseen blogiin. Jos haluat aloittaa Fuengirolassa selkeämmällä rakenteella, oma lähtötilanne voidaan arvioida suoraan.`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

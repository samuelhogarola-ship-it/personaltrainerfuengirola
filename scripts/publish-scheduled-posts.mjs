import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const domain = 'https://personaltrainerfuengirola.com';
const today = process.argv[2] || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid'
}).format(new Date());
const scheduled = JSON.parse(fs.readFileSync(path.join(root, 'scripts/scheduled-posts.json'), 'utf8'));
const scheduledSlugs = new Set(scheduled.map((post) => post.slug));

const langs = {
  es: {
    prefix: '',
    blog: '/blog/',
    dateLocale: 'es-ES',
    published: 'Publicado',
    tag: {
      nutrition: 'Nutrición',
      routine: 'Rutinas'
    }
  },
  en: {
    prefix: '/en',
    blog: '/en/blog/',
    dateLocale: 'en-GB',
    published: 'Published',
    tag: {
      nutrition: 'Nutrition',
      routine: 'Routines'
    }
  },
  fi: {
    prefix: '/fi',
    blog: '/fi/blog/',
    dateLocale: 'fi-FI',
    published: 'Julkaistu',
    tag: {
      nutrition: 'Ravinto',
      routine: 'Rutiinit'
    }
  }
};

function filePath(...parts) {
  return path.join(root, ...parts.filter(Boolean));
}

function urlFor(lang, slug) {
  return `${langs[lang].prefix}/blog/${slug}/`;
}

function absUrl(lang, slug) {
  return `${domain}${urlFor(lang, slug)}`;
}

function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
}

function readPost(lang, slug) {
  const cfg = langs[lang];
  return fs.readFileSync(filePath(cfg.prefix.slice(1), 'blog', slug, 'index.html'), 'utf8');
}

function writePost(lang, slug, html) {
  const cfg = langs[lang];
  fs.writeFileSync(filePath(cfg.prefix.slice(1), 'blog', slug, 'index.html'), html);
}

function extract(pattern, html, fallback = '') {
  const match = html.match(pattern);
  return match ? match[1].trim() : fallback;
}

function makeCard(post, lang) {
  const cfg = langs[lang];
  const html = readPost(lang, post.slug);
  const title = extract(/<h1>([\s\S]*?)<\/h1>/, html, post.slug);
  const excerpt = extract(/<figcaption class="caption">([\s\S]*?)<\/figcaption>/, html, '');
  return `          <article class="blog-card reveal">
            <span class="tag">${cfg.tag[post.group]}</span>
            <h3><a href="${urlFor(lang, post.slug)}">${title}</a></h3>
            <p>${excerpt}</p>
          </article>`;
}

function updatePostVisibility(post, lang, isDue) {
  const cfg = langs[lang];
  let html = readPost(lang, post.slug);
  const robots = isDue ? 'index,follow' : 'noindex,nofollow';
  html = html.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);
  html = html.replace(/"datePublished": "[^"]+"/, `"datePublished": "${post.date}"`);
  const currentModified = extract(/"dateModified": "([^"]+)"/, html, post.date);
  html = html.replace(/"dateModified": "[^"]+"/, `"dateModified": "${isDue ? currentModified : post.date}"`);
  const prettyDate = formatDate(post.date, cfg.dateLocale);
  html = html.replace(new RegExp(`<span>${cfg.published}: [^<]+</span>`), `<span>${cfg.published}: ${prettyDate}</span>`);
  writePost(lang, post.slug, html);
}

function updateBlogIndex(lang, duePosts) {
  const cfg = langs[lang];
  const indexPath = filePath(cfg.prefix.slice(1), 'blog', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const cards = [...html.matchAll(/          <article class="blog-card reveal">[\s\S]*?          <\/article>/g)].map((match) => match[0]);
  const nonScheduledCards = cards.filter((card) => ![...scheduledSlugs].some((slug) => card.includes(`/blog/${slug}/`)));
  const dueCards = duePosts.map((post) => makeCard(post, lang));
  const start = html.indexOf('<div class="blog-grid">');
  const end = html.indexOf('        </div>', start);
  const replacement = `<div class="blog-grid">\n${[...dueCards, ...nonScheduledCards].join('\n')}\n`;
  html = html.slice(0, start) + replacement + html.slice(end);
  fs.writeFileSync(indexPath, html);
}

function sitemapBlock(post, lang) {
  const html = readPost(lang, post.slug);
  const lastmod = extract(/"dateModified": "([^"]+)"/, html, post.date);
  return `  <url>
    <loc>${absUrl(lang, post.slug)}</loc>
    <xhtml:link rel="alternate" hreflang="es" href="${absUrl('es', post.slug)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${absUrl('en', post.slug)}"/>
    <xhtml:link rel="alternate" hreflang="fi" href="${absUrl('fi', post.slug)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${absUrl('es', post.slug)}"/>
    <lastmod>${lastmod}</lastmod>
  </url>`;
}

function updateSitemap(duePosts) {
  const sitemapPath = filePath('sitemap.xml');
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const blocks = [...xml.matchAll(/  <url>[\s\S]*?  <\/url>/g)].map((match) => match[0]);
  const nonScheduledBlocks = blocks.filter((block) => ![...scheduledSlugs].some((slug) => block.includes(slug)));
  const scheduledBlocks = duePosts.flatMap((post) => Object.keys(langs).map((lang) => sitemapBlock(post, lang)));
  const combined = [...nonScheduledBlocks, ...scheduledBlocks].join('\n');
  xml = xml.replace(/<urlset[\s\S]*?>[\s\S]*<\/urlset>/, (match) => {
    const open = match.match(/<urlset[\s\S]*?>/)[0];
    return `${open}\n${combined}\n</urlset>`;
  });
  fs.writeFileSync(sitemapPath, xml);
}

const duePosts = scheduled
  .filter((post) => post.date <= today)
  .sort((a, b) => b.date.localeCompare(a.date));

for (const post of scheduled) {
  for (const lang of Object.keys(langs)) {
    updatePostVisibility(post, lang, post.date <= today);
  }
}

for (const lang of Object.keys(langs)) {
  updateBlogIndex(lang, duePosts);
}

updateSitemap(duePosts);

console.log(`Scheduled publish complete for ${today}: ${duePosts.length}/${scheduled.length} posts visible.`);

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function authorizeBuildRequest(authorization, secret) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}

export async function prepareContentRoot({ contentRoot, releaseBlogDir, releaseSitemapPath }) {
  const postsDir = path.join(contentRoot, 'blog-posts');
  const publicBlogDir = path.join(contentRoot, 'blog');
  const sitemapPath = path.join(contentRoot, 'sitemap.xml');
  await mkdir(postsDir, { recursive: true });
  await mergeMissingTree(releaseBlogDir, publicBlogDir);
  if (releaseSitemapPath && !(await exists(sitemapPath))) {
    await cp(releaseSitemapPath, sitemapPath);
  }
  return { postsDir, publicBlogDir, sitemapPath };
}

export function resolveStaticFile(requestPath, { siteRoot, publicBlogDir, sitemapPath }) {
  const decoded = decodeURIComponent(String(requestPath || '/'));
  if (decoded.includes('..')) return null;
  if (/^\/(?:blog-posts|site-data)(?:\/|$)/.test(decoded)) return null;
  if (decoded === '/sitemap.xml' && sitemapPath) return path.resolve(sitemapPath);

  const base = decoded === '/blog' || decoded.startsWith('/blog/')
    ? publicBlogDir
    : siteRoot;
  const relative = base === publicBlogDir
    ? decoded.replace(/^\/blog\/?/, '')
    : decoded.replace(/^\//, '');
  const target = path.resolve(base, relative || 'index.html');
  if (target !== path.resolve(base) && !target.startsWith(`${path.resolve(base)}${path.sep}`)) {
    return null;
  }
  return path.extname(target) ? target : path.join(target, 'index.html');
}

export async function renderPublishedPosts({ postsDir, publicBlogDir, siteUrl, blogIndexPath, sitemapPath }) {
  const files = await readdir(postsDir).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  let published = 0;
  let skipped = 0;
  const publishedPosts = [];

  for (const file of files.filter((entry) => entry.endsWith('.md')).sort()) {
    const source = await readFile(path.join(postsDir, file), 'utf8');
    const { meta, body } = parsePost(source);
    const slug = String(meta.slug || file.replace(/\.md$/, '')).trim();
    if (!SLUG_RE.test(slug)) throw new Error(`Slug inválido: ${slug}`);
    if (String(meta.status || 'draft').toLowerCase() !== 'published') {
      await rm(path.join(publicBlogDir, slug), { recursive: true, force: true });
      skipped += 1;
      continue;
    }

    const targetDir = path.join(publicBlogDir, slug);
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      path.join(targetDir, 'index.html'),
      renderPostHtml(meta, body, siteUrl),
      'utf8',
    );
    publishedPosts.push(meta);
    published += 1;
  }

  if (blogIndexPath) await updateBlogIndex(blogIndexPath, publishedPosts);
  if (sitemapPath) await updateSitemap(sitemapPath, publishedPosts, siteUrl);

  return { published, skipped };
}

function parsePost(source) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: source };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { meta, body: match[2].trim() };
}

function renderPostHtml(meta, body, siteUrl) {
  const title = escapeHtml(meta.title || meta.slug || 'Artículo');
  const description = escapeHtml(meta.description || 'Artículo de entrenamiento personal.');
  const slug = escapeHtml(meta.slug || 'articulo');
  const author = escapeHtml(meta.author || 'García');
  const date = escapeHtml(meta.date || new Date().toISOString().slice(0, 10));
  const canonical = `${siteUrl.replace(/\/$/, '')}/blog/${slug}/`;
  const article = meta.content_format === 'html' ? body : markdownToHtml(body);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | García</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <link rel="icon" type="image/png" href="/assets/images/favicon-96.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Saltar al contenido</a>
  <header class="site-header"><div class="header-inner"><a href="/" class="logo-wrap" aria-label="Ir a la página principal de Personal Trainer Fuengirola"><span class="logo-mark">PT</span><span class="logo-name"><span class="logo-main">Personal Trainer</span><span class="logo-sub">Fuengirola · García</span></span></a><nav class="site-nav" aria-label="Navegación principal"><a href="/">Inicio</a><a href="/sobre-garcia/">Sobre García</a><a href="/servicios/entrenamiento-personal-fuengirola/">Servicio</a><a href="/precios/">Precios</a><a href="/preguntas-frecuentes/">FAQ</a><a href="/blog/" aria-current="page">Blog</a></nav></div></header>
  <main class="article-shell" id="main-content">
    <nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a> / <a href="/blog/">Blog</a> / <span aria-current="page">${title}</span></nav>
    <p class="eyebrow">Artículo</p>
    <h1>${title}</h1>
    <div class="article-meta"><span>Publicado: ${date}</span><span>Autor: ${author}</span></div>
    <div class="article-body">${article}</div>
  </main>
  <footer class="footer"><div class="footer-inner"><div class="footer-top"><div class="footer-brand">Personal Trainer Fuengirola · García</div><div class="footer-links"><a href="/">Inicio</a><a href="/blog/">Volver al blog</a><a href="/legal/">Legal y privacidad</a></div></div></div></footer>
  <script src="/umami-analytics-core.js" defer></script>
  <script src="/site.js" defer></script>
</body>
</html>
`;
}

function markdownToHtml(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const value = block.trim();
      if (!value) return '';
      if (value.startsWith('## ')) return `<h2>${escapeHtml(value.slice(3))}</h2>`;
      if (value.startsWith('### ')) return `<h3>${escapeHtml(value.slice(4))}</h3>`;
      return `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

async function updateBlogIndex(indexPath, posts) {
  const start = '<!-- BLOGGER:START -->';
  const end = '<!-- BLOGGER:END -->';
  const cards = posts
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((meta) => `<article class="blog-card reveal"><span class="tag">${escapeHtml(meta.category || 'Entrenamiento')}</span><h3><a href="/blog/${escapeHtml(meta.slug)}/">${escapeHtml(meta.title)}</a></h3><p>${escapeHtml(meta.description)}</p></article>`)
    .join('\n');
  let html = await readFile(indexPath, 'utf8');
  const block = `${start}\n${cards}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (pattern.test(html)) html = html.replace(pattern, block);
  else html = html.replace('</div>', `${block}\n</div>`);
  await writeFile(indexPath, html, 'utf8');
}

async function updateSitemap(sitemapPath, posts, siteUrl) {
  const start = '<!-- BLOGGER:START -->';
  const end = '<!-- BLOGGER:END -->';
  const origin = siteUrl.replace(/\/$/, '');
  const urls = posts
    .map((meta) => `  <url><loc>${origin}/blog/${escapeHtml(meta.slug)}/</loc><lastmod>${escapeHtml(meta.date || new Date().toISOString().slice(0, 10))}</lastmod></url>`)
    .join('\n');
  let xml = await readFile(sitemapPath, 'utf8');
  const block = `${start}\n${urls}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (pattern.test(xml)) xml = xml.replace(pattern, block);
  else xml = xml.replace('</urlset>', `${block}\n</urlset>`);
  await writeFile(sitemapPath, xml, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function mergeMissingTree(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) await mergeMissingTree(source, target);
    else if (entry.isFile() && !(await exists(target))) await cp(source, target);
  }
}

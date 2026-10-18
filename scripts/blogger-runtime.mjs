import { mkdir, readdir, readFile, rm, writeFile, rename, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOCK_RE = /<!-- BLOGGER:START -->[\s\S]*?<!-- BLOGGER:END -->/g;
const MEDIA_RE = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?|ttf|mp4|webm|pdf)$/i;
const PUBLIC_FILES = new Set(['index.html', 'styles.css', 'site.js', 'umami-analytics.js', 'umami-analytics-core.js', 'umami-config.json', 'robots.txt', 'sitemap.xml', 'favicon.png', 'apple-touch-icon.png']);

export function authorizeBuildRequest(authorization, secret) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}

export async function prepareContentRoot({ contentRoot, releaseBlogDir, releaseSitemapPath }) {
  const postsDir = path.join(contentRoot, 'blog-posts');
  const publicBlogDir = path.join(contentRoot, 'blog');
  const sitemapPath = path.join(contentRoot, 'sitemap.xml');
  await mkdir(postsDir, { recursive: true });
  const state = await readState(publicBlogDir);
  const releaseFiles = await collectReleaseFiles(releaseBlogDir, 'blog');
  if (releaseSitemapPath) releaseFiles.set('sitemap.xml', await readFile(releaseSitemapPath));
  const nextRelease = {};
  for (const [relative, contents] of releaseFiles) {
    const target = path.join(contentRoot, relative);
    await assertNoSymlinks(contentRoot, target);
    const current = await readOptional(target);
    const aggregate = relative === 'blog/index.html' || relative === 'sitemap.xml';
    const base = aggregate && current ? stripBlock(current.toString()) : current;
    const releaseBase = aggregate ? stripBlock(contents.toString()) : contents;
    const oldHash = state.release[relative];
    if (!current || (oldHash && hash(base) === oldHash)) {
      const oldBlock = aggregate && current ? current.toString().match(/<!-- BLOGGER:START -->[\s\S]*?<!-- BLOGGER:END -->/)?.[0] : null;
      const output = oldBlock ? insertBlock(String(releaseBase), oldBlock, relative === 'sitemap.xml') : releaseBase;
      await atomicWrite(target, output);
    }
    nextRelease[relative] = hash(releaseBase);
  }
  // Only remove obsolete release files that are still byte-identical to our last release.
  for (const [relative, digest] of Object.entries(state.release)) {
    if (releaseFiles.has(relative)) continue;
    const target = path.join(contentRoot, relative);
    await assertNoSymlinks(contentRoot, target);
    const current = await readOptional(target);
    if (current && hash(current) === digest) await rm(target);
  }
  state.release = nextRelease;
  await saveState(publicBlogDir, state);
  return { postsDir, publicBlogDir, sitemapPath };
}

export function resolveStaticFile(requestPath, { siteRoot, publicBlogDir, sitemapPath }) {
  let decoded;
  try { decoded = decodeURIComponent(String(requestPath || '/')); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(part => part.startsWith('.'))) return null;
  const relativeUrl = decoded.slice(1);
  const isBlog = decoded === '/blog' || decoded.startsWith('/blog/');
  const isPage = /^\/(?:en\/|fi\/)?(?:blog(?:\/[a-z0-9-]+)?|legal|precios|preguntas-frecuentes|sobre-garcia|servicios\/[a-z0-9-]+)(?:\/index\.html|\/)?$/.test(decoded)
    || /^\/(?:en|fi)(?:\/index\.html|\/)?$/.test(decoded);
  const isMedia = MEDIA_RE.test(decoded) && (/^\/(?:assets\/|legal\/assets\/)/.test(decoded) || isBlog);
  if (decoded !== '/' && !PUBLIC_FILES.has(relativeUrl) && !isPage && !isMedia) return null;
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
  let skipped = 0;
  const posts = [];
  const slugs = new Set();
  const state = await readState(publicBlogDir);

  for (const file of files.filter((entry) => entry.endsWith('.md')).sort()) {
    const source = await readFile(path.join(postsDir, file), 'utf8');
    const { meta, body } = parsePost(source);
    const slug = String(meta.slug || file.replace(/\.md$/, '')).trim();
    if (!SLUG_RE.test(slug)) throw new Error(`Slug inválido: ${slug}`);
    if (slugs.has(slug)) throw new Error(`Duplicate slug: ${slug}`);
    slugs.add(slug);
    meta.slug = slug;
    if (String(meta.status || 'draft').toLowerCase() !== 'published') {
      skipped += 1;
      continue;
    }
    const target = path.join(publicBlogDir, slug, 'index.html');
    await assertNoSymlinks(publicBlogDir, target);
    const current = await readOptional(target);
    if (current && (!Object.hasOwn(state.generated, slug) || hash(current) !== state.generated[slug])) {
      throw new Error(`Existing article collision: ${slug}`);
    }
    posts.push({ meta, html: renderPostHtml(meta, body, siteUrl), target });
  }

  // Validate every input and removal before changing public files.
  const publishedPosts = posts.map(post => post.meta);
  const active = new Set(publishedPosts.map(meta => meta.slug));
  const obsolete = [];
  for (const [slug, digest] of Object.entries(state.generated)) {
    if (active.has(slug)) continue;
    const target = path.join(publicBlogDir, slug, 'index.html');
    await assertNoSymlinks(publicBlogDir, target);
    const current = await readOptional(target);
    if (current && hash(current) !== digest) throw new Error(`Editorial changes prevent removal: ${slug}`);
    if (current) obsolete.push(target);
  }
  const index = blogIndexPath ? await updateBlogIndex(blogIndexPath, publishedPosts) : null;
  const sitemap = sitemapPath ? await updateSitemap(sitemapPath, publishedPosts, siteUrl) : null;
  const generated = {};
  for (const post of posts) {
    await atomicWrite(post.target, post.html);
    generated[post.meta.slug] = hash(post.html);
  }
  // Never recursively remove a slug: Studio uploads belong to the editor.
  for (const target of obsolete) await rm(target, { force: true });
  if (blogIndexPath) await atomicWrite(blogIndexPath, index);
  if (sitemapPath) await atomicWrite(sitemapPath, sitemap);
  state.generated = generated;
  await saveState(publicBlogDir, state);
  return { published: posts.length, skipped };
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
  const html = await readFile(indexPath, 'utf8');
  const block = `${start}\n${cards}\n${end}`;
  return insertBlock(stripBlock(html), block, false);
}

async function updateSitemap(sitemapPath, posts, siteUrl) {
  const start = '<!-- BLOGGER:START -->';
  const end = '<!-- BLOGGER:END -->';
  const origin = siteUrl.replace(/\/$/, '');
  const urls = posts
    .map((meta) => `  <url><loc>${origin}/blog/${escapeHtml(meta.slug)}/</loc><lastmod>${escapeHtml(meta.date || new Date().toISOString().slice(0, 10))}</lastmod></url>`)
    .join('\n');
  const xml = await readFile(sitemapPath, 'utf8');
  const block = `${start}\n${urls}\n${end}`;
  return insertBlock(stripBlock(xml), block, true);
}

function stripBlock(text) {
  return text.replace(BLOCK_RE, '');
}

function insertBlock(text, block, sitemap) {
  const anchor = sitemap ? '</urlset>' : '<div class="blog-grid">';
  if (!text.includes(anchor)) throw new Error(`Missing publication anchor: ${anchor}`);
  return text.replace(anchor, () => sitemap ? `${block}${anchor}` : `${anchor}${block}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function collectReleaseFiles(sourceDir, prefix, files = new Map()) {
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await collectReleaseFiles(source, relative, files);
    else if (entry.isFile()) files.set(relative, await readFile(source));
  }
  return files;
}

function hash(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function statePath(publicBlogDir) {
  return path.join(publicBlogDir, '..', '.blogger-state.json');
}

async function readState(publicBlogDir) {
  const contents = await readOptional(statePath(publicBlogDir));
  if (!contents) return { version: 1, release: {}, generated: {} };
  const state = JSON.parse(contents);
  if (state.version !== 1 || !state.release || !state.generated) throw new Error('Invalid Blogger state');
  for (const [file, digest] of Object.entries(state.release)) {
    if ((!file.startsWith('blog/') && file !== 'sitemap.xml') || file.split('/').some(p => !p || p.startsWith('.')) || file.includes('\\') || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid release manifest');
  }
  for (const [slug, digest] of Object.entries(state.generated)) {
    if (!SLUG_RE.test(slug) || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid generated manifest');
  }
  return state;
}

async function saveState(publicBlogDir, state) {
  await atomicWrite(statePath(publicBlogDir), JSON.stringify(state, null, 2));
}

async function atomicWrite(target, contents) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, contents, { flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function assertNoSymlinks(root, target) {
  let current = path.resolve(root);
  const relative = path.relative(current, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path outside content root');
  for (const part of ['', ...relative.split(path.sep)]) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink in content path: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

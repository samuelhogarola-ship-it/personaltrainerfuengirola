import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  authorizeBuildRequest,
  prepareContentRoot,
  renderPublishedPosts,
  resolveStaticFile,
} from '../scripts/blogger-runtime.mjs';

test('build hook accepts only the configured Studio secret', () => {
  const secret = 'studio-personal-secret';
  assert.equal(authorizeBuildRequest(`Bearer ${secret}`, secret), true);
  assert.equal(authorizeBuildRequest('Bearer wrong', secret), false);
  assert.equal(authorizeBuildRequest('', secret), false);
  assert.equal(authorizeBuildRequest(`Bearer ${secret}`, ''), false);
});

test('renders a published Markdown post into the public blog directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'personal-blogger-'));
  await writeFile(
    path.join(root, 'blog-index.html'),
    '<main><div class="blog-grid"><article>Existente</article></div></main>',
  );
  await writeFile(path.join(root, 'sitemap.xml'), '<urlset><url><loc>https://personaltrainerfuengirola.com/</loc></url></urlset>');
  await writeFile(
    path.join(root, 'post.md'),
    `---\ntitle: Entrenamiento sostenible\nslug: entrenamiento-sostenible\ndescription: Una guía práctica para entrenar con constancia.\ndate: 2026-10-18\nauthor: García\nstatus: published\n---\n\n## Empieza con una base realista\n\nEntrena con una progresión que puedas mantener.\n`,
  );

  const result = await renderPublishedPosts({
    postsDir: root,
    publicBlogDir: path.join(root, 'public-blog'),
    siteUrl: 'https://personaltrainerfuengirola.com',
    blogIndexPath: path.join(root, 'blog-index.html'),
    sitemapPath: path.join(root, 'sitemap.xml'),
  });

  assert.deepEqual(result, { published: 1, skipped: 0 });
  const html = await readFile(
    path.join(root, 'public-blog', 'entrenamiento-sostenible', 'index.html'),
    'utf8',
  );
  assert.match(html, /<h1>Entrenamiento sostenible<\/h1>/);
  assert.match(html, /<h2>Empieza con una base realista<\/h2>/);
  assert.match(html, /https:\/\/personaltrainerfuengirola\.com\/blog\/entrenamiento-sostenible\//);
  assert.match(await readFile(path.join(root, 'blog-index.html'), 'utf8'), /href="\/blog\/entrenamiento-sostenible\/"/);
  assert.match(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/personaltrainerfuengirola\.com\/blog\/entrenamiento-sostenible\/<\/loc>/);
});

test('preserves editor HTML content and renders local post images', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'personal-blogger-'));
  await writeFile(
    path.join(root, 'html.md'),
    `---\ntitle: Post visual\nslug: post-visual\ndescription: Post con formato enriquecido.\nstatus: published\ncontent_format: html\n---\n\n<h2>Bloque visual</h2><p>Texto <strong>enriquecido</strong>.</p><img src="img/foto.webp" alt="Entrenamiento">\n`,
  );
  await renderPublishedPosts({
    postsDir: root,
    publicBlogDir: path.join(root, 'public-blog'),
    siteUrl: 'https://personaltrainerfuengirola.com',
  });
  const html = await readFile(path.join(root, 'public-blog', 'post-visual', 'index.html'), 'utf8');
  assert.match(html, /<h2>Bloque visual<\/h2>/);
  assert.match(html, /<img src="img\/foto.webp" alt="Entrenamiento">/);
});

test('does not publish drafts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'personal-blogger-'));
  await writeFile(
    path.join(root, 'draft.md'),
    `---\ntitle: Borrador\nslug: borrador\ndescription: Contenido todavía no publicado.\nstatus: draft\n---\n\nTexto privado.\n`,
  );

  const result = await renderPublishedPosts({
    postsDir: root,
    publicBlogDir: path.join(root, 'public-blog'),
    siteUrl: 'https://personaltrainerfuengirola.com',
  });

  assert.deepEqual(result, { published: 0, skipped: 1 });
});

test('seeds the persistent blog once and preserves later edits', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'personal-blogger-'));
  const releaseBlogDir = path.join(root, 'release-blog');
  const releaseSitemapPath = path.join(root, 'release-sitemap.xml');
  const contentRoot = path.join(root, 'site-data');
  await mkdir(path.join(releaseBlogDir, 'post'), { recursive: true });
  await writeFile(path.join(releaseBlogDir, 'post', 'index.html'), 'release');
  await writeFile(releaseSitemapPath, '<urlset>release</urlset>');

  const prepared = await prepareContentRoot({ contentRoot, releaseBlogDir, releaseSitemapPath });
  assert.equal(
    await readFile(path.join(prepared.publicBlogDir, 'post', 'index.html'), 'utf8'),
    'release',
  );
  assert.equal(await readFile(prepared.sitemapPath, 'utf8'), '<urlset>release</urlset>');

  await writeFile(path.join(prepared.publicBlogDir, 'post', 'index.html'), 'edited');
  await mkdir(path.join(releaseBlogDir, 'new-post'), { recursive: true });
  await writeFile(path.join(releaseBlogDir, 'new-post', 'index.html'), 'new release');
  await prepareContentRoot({ contentRoot, releaseBlogDir, releaseSitemapPath });
  assert.equal(
    await readFile(path.join(prepared.publicBlogDir, 'post', 'index.html'), 'utf8'),
    'edited',
  );
  assert.equal(
    await readFile(path.join(prepared.publicBlogDir, 'new-post', 'index.html'), 'utf8'),
    'new release',
  );
});

test('serves blog pages from the persistent root and keeps sources private', () => {
  const options = {
    siteRoot: '/app/site',
    publicBlogDir: '/app/site-data/blog',
    sitemapPath: '/app/site-data/sitemap.xml',
  };
  assert.equal(
    resolveStaticFile('/blog/example/', options),
    '/app/site-data/blog/example/index.html',
  );
  assert.equal(resolveStaticFile('/styles.css', options), '/app/site/styles.css');
  assert.equal(resolveStaticFile('/sitemap.xml', options), '/app/site-data/sitemap.xml');
  assert.equal(resolveStaticFile('/blog-posts/example.md', options), null);
  assert.equal(resolveStaticFile('/site-data/blog/example/index.html', options), null);
  assert.equal(resolveStaticFile('/../secret', options), null);
});

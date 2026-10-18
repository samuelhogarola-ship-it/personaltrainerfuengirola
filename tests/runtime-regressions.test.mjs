import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareContentRoot, renderPublishedPosts, resolveStaticFile } from '../scripts/blogger-runtime.mjs';

const siteUrl = 'https://personaltrainerfuengirola.com';
const post = (slug, status = 'published') => `---\ntitle: Article\n${slug === null ? '' : `slug: ${slug}\n`}description: Description\nstatus: ${status}\ndate: 2026-10-18\n---\n\n## Content\n\nText.\n`;

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pt-regression-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const releaseBlogDir = path.join(root, 'release/blog');
  const releaseSitemapPath = path.join(root, 'release/sitemap.xml');
  await mkdir(path.join(releaseBlogDir, 'legacy'), { recursive: true });
  await writeFile(path.join(releaseBlogDir, 'legacy/index.html'), 'Legacy article');
  await writeFile(path.join(releaseBlogDir, 'index.html'), await readFile(new URL('../blog/index.html', import.meta.url), 'utf8'));
  await writeFile(releaseSitemapPath, '<urlset><url><loc>https://personaltrainerfuengirola.com/</loc></url></urlset>');
  const prepare = { contentRoot: path.join(root, 'content'), releaseBlogDir, releaseSitemapPath };
  const prepared = await prepareContentRoot(prepare);
  const options = { ...prepared, siteUrl, blogIndexPath: path.join(prepared.publicBlogDir, 'index.html') };
  return { ...options, options, prepare, root };
}

test('unpublishing preserves uploaded media and a draft cannot delete a legacy article', async t => {
  const f = await fixture(t);
  const source = path.join(f.postsDir, 'post.md');
  await writeFile(source, post('editorial'));
  await renderPublishedPosts(f.options);
  await mkdir(path.join(f.publicBlogDir, 'editorial/img'));
  await writeFile(path.join(f.publicBlogDir, 'editorial/img/photo.webp'), 'original upload');
  await writeFile(source, post('editorial', 'draft'));
  await writeFile(path.join(f.postsDir, 'legacy.md'), post('legacy', 'draft'));
  await renderPublishedPosts(f.options);
  assert.equal(await readFile(path.join(f.publicBlogDir, 'editorial/img/photo.webp'), 'utf8'), 'original upload');
  assert.equal(await readFile(path.join(f.publicBlogDir, 'legacy/index.html'), 'utf8'), 'Legacy article');
  await assert.rejects(readFile(path.join(f.publicBlogDir, 'editorial/index.html')), { code: 'ENOENT' });
});

test('publishing cannot overwrite an existing static article', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.postsDir, 'legacy.md'), post('legacy'));
  await assert.rejects(renderPublishedPosts(f.options), /collision|colisi[oó]n|existing/i);
  assert.equal(await readFile(path.join(f.publicBlogDir, 'legacy/index.html'), 'utf8'), 'Legacy article');
});

test('renamed and deleted sources remove only their previous generated pages', async t => {
  const f = await fixture(t);
  const source = path.join(f.postsDir, 'post.md');
  await writeFile(source, post('before'));
  await renderPublishedPosts(f.options);
  await writeFile(source, post('after'));
  await renderPublishedPosts(f.options);
  await assert.rejects(readFile(path.join(f.publicBlogDir, 'before/index.html')), { code: 'ENOENT' });
  await rm(source);
  await renderPublishedPosts(f.options);
  await assert.rejects(readFile(path.join(f.publicBlogDir, 'after/index.html')), { code: 'ENOENT' });
  assert.doesNotMatch(await readFile(f.sitemapPath, 'utf8'), /\/blog\/(before|after)\//);
});

test('release updates refresh scheduled pages and indexes while preserving editorial pages and media', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.postsDir, 'editorial.md'), post('editorial'));
  await renderPublishedPosts(f.options);
  const editorial = await readFile(path.join(f.publicBlogDir, 'editorial/index.html'), 'utf8');
  await mkdir(path.join(f.prepare.releaseBlogDir, 'new-release'));
  await writeFile(path.join(f.prepare.releaseBlogDir, 'new-release/index.html'), 'New release article');
  await writeFile(path.join(f.prepare.releaseBlogDir, 'legacy/index.html'), 'Scheduled now index,follow');
  const releaseIndex = await readFile(path.join(f.prepare.releaseBlogDir, 'index.html'), 'utf8');
  await writeFile(path.join(f.prepare.releaseBlogDir, 'index.html'), releaseIndex.replace('Lecturas para empezar', 'Updated release index'));
  await writeFile(f.prepare.releaseSitemapPath, '<urlset><url><loc>https://personaltrainerfuengirola.com/en/blog/new-release/</loc></url></urlset>');
  await prepareContentRoot(f.prepare);
  assert.equal(await readFile(path.join(f.publicBlogDir, 'legacy/index.html'), 'utf8'), 'Scheduled now index,follow');
  const index = await readFile(f.blogIndexPath, 'utf8');
  assert.match(index, /Updated release index/);
  assert.match(index, /\/blog\/editorial\//);
  assert.match(await readFile(f.sitemapPath, 'utf8'), /\/en\/blog\/new-release\//);
  assert.match(await readFile(f.sitemapPath, 'utf8'), /\/blog\/editorial\//);
  assert.equal(await readFile(path.join(f.publicBlogDir, 'editorial/index.html'), 'utf8'), editorial);
  await writeFile(path.join(f.publicBlogDir, 'legacy/index.html'), 'Manual editorial override');
  await writeFile(path.join(f.prepare.releaseBlogDir, 'legacy/index.html'), 'Later release');
  await prepareContentRoot(f.prepare);
  assert.equal(await readFile(path.join(f.publicBlogDir, 'legacy/index.html'), 'utf8'), 'Manual editorial override');
});

test('cards use the real blog grid and normalized fallback slug everywhere', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.postsDir, 'fallback-name.md'), post(null));
  await renderPublishedPosts(f.options);
  const index = await readFile(f.blogIndexPath, 'utf8');
  const grid = index.indexOf('<div class="blog-grid">');
  assert(index.indexOf('<!-- BLOGGER:START -->') > grid);
  assert(index.indexOf('<!-- BLOGGER:END -->') < index.indexOf('</div>', grid));
  assert.match(index, /href="\/blog\/fallback-name\/"/);
  assert.match(await readFile(path.join(f.publicBlogDir, 'fallback-name/index.html'), 'utf8'), /rel="canonical" href="https:\/\/personaltrainerfuengirola.com\/blog\/fallback-name\/"/);
  assert.match(await readFile(f.sitemapPath, 'utf8'), /\/blog\/fallback-name\//);
});

test('private repository paths and non-public extensions cannot be served', () => {
  const options = { siteRoot: '/app/site', publicBlogDir: '/app/data/blog' };
  for (const url of ['/scripts/blogger-runtime.mjs', '/scripts/scheduled-posts.json', '/docs/private.md', '/.env.production', '/package.json', '/blog/post/source.md', '/assets/secret.json', '/blog/.state.json', '/blog/%2eenv.production']) {
    assert.equal(resolveStaticFile(url, options), null, url);
  }
  for (const url of ['/styles.css', '/site.js', '/umami-config.json', '/en/blog/post/', '/assets/images/photo.webp', '/legal/assets/owner-nie.webp']) {
    assert.ok(resolveStaticFile(url, options), url);
  }
});

test('real scheduled publisher survives a redeploy with all three languages and Studio posts', async t => {
  const f = await fixture(t);
  const release = path.dirname(f.prepare.releaseBlogDir);
  for (const relative of ['blog', 'en/blog', 'fi/blog', 'scripts/publish-scheduled-posts.mjs', 'scripts/scheduled-posts.json', 'sitemap.xml']) {
    await mkdir(path.dirname(path.join(release, relative)), { recursive: true });
    await cp(new URL(`../${relative}`, import.meta.url), path.join(release, relative), { recursive: true });
  }
  const publisher = path.join(release, 'scripts/publish-scheduled-posts.mjs');
  execFileSync(process.execPath, [publisher, '2026-07-03']);
  // Fresh migration before the scheduled date.
  const prepare = { ...f.prepare, contentRoot: path.join(f.root, 'scheduled-volume') };
  const prepared = await prepareContentRoot(prepare);
  const options = { ...prepared, siteUrl, blogIndexPath: path.join(prepared.publicBlogDir, 'index.html') };
  const slug = 'nutricion-deportiva-basica-fuengirola';
  assert.match(await readFile(path.join(prepared.publicBlogDir, slug, 'index.html'), 'utf8'), /noindex,nofollow/);
  await writeFile(path.join(prepared.postsDir, 'editorial.md'), post('editorial'));
  await renderPublishedPosts(options);
  execFileSync(process.execPath, [publisher, '2026-07-23']);
  await prepareContentRoot(prepare);
  await renderPublishedPosts(options);
  const sitemap = await readFile(prepared.sitemapPath, 'utf8');
  for (const locale of ['', 'en/', 'fi/']) {
    const article = locale ? path.join(release, locale, 'blog', slug, 'index.html') : path.join(prepared.publicBlogDir, slug, 'index.html');
    const index = locale ? path.join(release, locale, 'blog/index.html') : options.blogIndexPath;
    assert.match(await readFile(article, 'utf8'), /content="index,follow"/);
    assert((await readFile(index, 'utf8')).includes(`/${locale}blog/${slug}/`));
    assert(sitemap.includes(`/${locale}blog/${slug}/`));
  }
  assert.match(sitemap, /\/blog\/editorial\//);
  assert.match(await readFile(options.blogIndexPath, 'utf8'), /\/blog\/editorial\//);
});

test('the public allowlist preserves every existing HTML route and referenced local asset', async () => {
  const siteRoot = path.resolve('.');
  const options = { siteRoot, publicBlogDir: path.join(siteRoot, 'blog') };
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'site-data', 'tests'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (file.endsWith('.html')) {
        const route = '/' + path.relative(siteRoot, file).replace(/index\.html$/, '');
        assert.equal(resolveStaticFile(route, options), file, route);
        const html = await readFile(file, 'utf8');
        for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) assert.ok(resolveStaticFile(match[1], options), match[1]);
      }
    }
  }
  await walk(siteRoot);
});

test('independent editorial changes are not overwritten or removed', async t => {
  const f = await fixture(t);
  const source = path.join(f.postsDir, 'post.md');
  const target = path.join(f.publicBlogDir, 'editorial/index.html');
  await writeFile(source, post('editorial'));
  await renderPublishedPosts(f.options);
  await writeFile(target, 'Manually edited HTML');
  await assert.rejects(renderPublishedPosts(f.options), /collision/i);
  await rm(source);
  await assert.rejects(renderPublishedPosts(f.options), /Editorial changes/);
  assert.equal(await readFile(target, 'utf8'), 'Manually edited HTML');
});

test('blog card text is literal even when it contains replacement-string tokens', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.postsDir, 'literal.md'), post('literal').replace('title: Article', () => 'title: Price $& $$'));
  await renderPublishedPosts(f.options);
  const html = await readFile(f.blogIndexPath, 'utf8');
  assert.equal(html.match(/href="\/blog\/literal\/">([\s\S]*?)<\/a>/)[1], 'Price $&amp; $$');
});

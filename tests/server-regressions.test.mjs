import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';

test('HTTP runtime preserves redirects, protects private files, and serves public GET/HEAD', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pt-server-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'site');
  await mkdir(path.join(site, 'blog'), { recursive: true });
  await mkdir(path.join(site, 'assets'));
  await writeFile(path.join(site, 'blog/index.html'), '<div class="blog-grid"></div>');
  await writeFile(path.join(site, 'index.html'), 'Public home');
  await writeFile(path.join(site, 'sitemap.xml'), '<urlset></urlset>');
  await writeFile(path.join(site, '.env.production'), 'PRIVATE_FIXTURE');
  await symlink(path.join(site, '.env.production'), path.join(site, 'assets/leak.webp'));
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const child = spawn(process.execPath, ['scripts/start-site.mjs'], {
    env: { ...process.env, PERSONAL_SITE_ROOT: site, PERSONAL_CONTENT_DIR: path.join(root, 'data'), HOST: '127.0.0.1', PORT: String(port), BLOGGER_BUILD_SECRET: 'test-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    child.stdout.on('data', data => { if (String(data).includes('listening')) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    child.once('error', reject);
  });
  const get = (url, options) => fetch(`http://127.0.0.1:${port}${url}`, { redirect: 'manual', ...options });
  assert.equal((await get('/health')).status, 200);
  assert.equal((await get('/api/blogger/build', { method: 'POST' })).status, 401);
  assert.equal((await get('/api/blogger/build', { method: 'POST', headers: { authorization: 'Bearer test-secret' } })).status, 200);
  for (const prefix of ['', '/en', '/fi']) {
    const response = await get(`${prefix}/sobre-sorvali/?utm_source=test`);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), `${prefix}/sobre-garcia/?utm_source=test`);
  }
  const canonical = await get('/blog/index.html?q=1');
  assert.equal(canonical.status, 301);
  assert.equal(canonical.headers.get('location'), '/blog/?q=1');
  for (const url of ['/.env.production', '/assets/leak.webp', '/blog-posts/post.md']) assert.equal((await get(url)).status, 404, url);
  assert.equal(await (await get('/')).text(), 'Public home');
  const head = await get('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '11');
  assert.equal(await head.text(), '');
});

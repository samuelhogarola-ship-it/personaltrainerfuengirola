import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Coolify image renders Umami config before starting the Blogger runtime', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /scripts\/render-umami-config\.sh/);
  assert.match(dockerfile, /scripts\/start-site\.mjs/);
  assert.match(dockerfile, /PERSONAL_CONTENT_DIR=\/app\/site-data/);
});

test('production contract declares the Personal Umami site and Blogger secret', async () => {
  const env = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(env, /^UMAMI_WEBSITE_ID=f712523b-142d-4e87-a2d8-8d09876a04ec$/m);
  assert.match(env, /^BLOGGER_BUILD_SECRET=$/m);
});

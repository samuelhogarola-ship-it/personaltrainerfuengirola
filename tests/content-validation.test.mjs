import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
const script = path.resolve('scripts/validate-content.mjs');
function fixture(t, count = 11) {
  const root = mkdtempSync(path.join(tmpdir(), 'pt-content-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts'), { recursive: true });
  const posts = Array.from({length: count}, (_,i) => ({slug: `post-${i}`, date: '2026-10-01', group: 'routine'}));
  writeFileSync(path.join(root, 'scripts/scheduled-posts.json'), JSON.stringify(posts));
  for (const post of posts) for (const locale of ['es','en','fi']) {
    const route = `${locale === 'es' ? '' : `/${locale}`}/blog/${post.slug}/`;
    const dir = path.join(root, route); mkdirSync(dir, {recursive:true});
    writeFileSync(path.join(dir,'index.html'), `<html lang="${locale}"><head><title>Article</title><meta name="description" content="Description"><link rel="canonical" href="https://personaltrainerfuengirola.com${route}"></head><body><h1>Article</h1></body></html>`);
  }
  return {root,posts};
}
function validate(root) {return spawnSync(process.execPath,[script,root],{encoding:'utf8'});}
test('accepts an expanding trilingual catalogue beyond ten posts',t=>{
  const {root}=fixture(t); const result=validate(root);
  assert.equal(result.status,0,result.stderr);
});
test('rejects a missing scheduled translation',t=>{
  const {root}=fixture(t); rmSync(path.join(root,'fi/blog/post-0/index.html'));
  const result=validate(root); assert.equal(result.status,1); assert.match(result.stderr,/missing.*fi\/blog\/post-0/i);
});
test('rejects duplicate slugs and impossible dates',t=>{
  const {root,posts}=fixture(t); posts[1].slug=posts[0].slug; posts[2].date='2026-02-30';
  writeFileSync(path.join(root,'scripts/scheduled-posts.json'),JSON.stringify(posts));
  const result=validate(root); assert.equal(result.status,1); assert.match(result.stderr,/duplicate/i); assert.match(result.stderr,/date/i);
});
test('rejects broken local images and canonical URLs',t=>{
  const {root}=fixture(t);
  writeFileSync(path.join(root,'blog/post-0/index.html'), '<html lang="es"><title>Article</title><meta name="description" content="Description"><link rel="canonical" href="https://wrong.example/"><h1>Article</h1><img src="/missing.webp">');
  const result=validate(root); assert.equal(result.status,1); assert.match(result.stderr,/canonical/i); assert.match(result.stderr,/missing.webp/i);
});

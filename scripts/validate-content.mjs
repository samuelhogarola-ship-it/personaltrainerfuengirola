import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const domain = 'https://personaltrainerfuengirola.com';
const errors = [];
function fail(message) { errors.push(message); }
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
function files(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match=>[match[1].toLowerCase(),match[2]]));
}
const posts = JSON.parse(fs.readFileSync(path.join(root,'scripts/scheduled-posts.json'),'utf8'));
if (!Array.isArray(posts)) throw new Error('Schedule must be an array');
const slugs = new Set();
for (const post of posts) {
  if (typeof post.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) { fail(`Invalid slug: ${post.slug}`); continue; }
  if (slugs.has(post.slug)) fail(`Duplicate scheduled slug: ${post.slug}`);
  slugs.add(post.slug);
  if (!validDate(post.date)) fail(`Invalid date for ${post.slug}: ${post.date}`);
  if (!['nutrition','routine'].includes(post.group)) fail(`Invalid group for ${post.slug}: ${post.group}`);
  for (const prefix of ['', 'en/', 'fi/']) {
    const file = `${prefix}blog/${post.slug}/index.html`;
    if (!fs.existsSync(path.join(root,file))) fail(`Missing translation: ${file}`);
  }
}
const htmlFiles = files(root);
if (!htmlFiles.length) fail('No HTML pages found');
for (const file of htmlFiles) {
  const relative = path.relative(root,file).split(path.sep).join('/');
  const html = fs.readFileSync(file,'utf8');
  const route = `/${relative.replace(/index\.html$/, '')}`;
  const language = relative.startsWith('en/') ? 'en' : relative.startsWith('fi/') ? 'fi' : 'es';
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  if (attributes(htmlTag).lang !== language) fail(`Wrong HTML language: ${relative}`);
  if (!/<title>\s*\S[\s\S]*?<\/title>/i.test(html)) fail(`Missing title: ${relative}`);
  if (!/<h1\b[^>]*>\s*\S/i.test(html)) fail(`Missing h1: ${relative}`);
  const tags = [...html.matchAll(/<(?:link|meta|img)\b[^>]*>/gi)].map(match=>({tag:match[0],attrs:attributes(match[0])}));
  const canonicals = tags.filter(({attrs})=>attrs.rel === 'canonical');
  if (canonicals.length !== 1 || canonicals[0].attrs.href !== domain + route) fail(`Wrong canonical: ${relative}`);
  if (!tags.some(({attrs})=>attrs.name === 'description' && attrs.content?.trim())) fail(`Missing description: ${relative}`);
  for (const {tag,attrs} of tags) {
    const url = /^<img/i.test(tag) ? attrs.src : attrs.property === 'og:image' ? attrs.content : attrs.rel === 'alternate' ? attrs.href : null;
    if (!url || /^(?:data:|mailto:|tel:)/i.test(url)) continue;
    let parsed;
    try { parsed = new URL(url, domain + route); } catch { fail(`Invalid URL ${url}: ${relative}`); continue; }
    if (parsed.origin !== domain) continue;
    const local = path.join(root,decodeURIComponent(parsed.pathname),parsed.pathname.endsWith('/') ? 'index.html' : '');
    if (!fs.existsSync(local)) fail(`Missing local target ${url}: ${relative}`);
  }
}
if (errors.length) {
  console.error(`Content validation failed:\n${errors.map(error=>`- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} pages and ${posts.length} scheduled posts across ES/EN/FI; no fixed article limit.`);
}

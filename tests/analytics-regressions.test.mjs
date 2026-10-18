import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import test from 'node:test';

async function page(hostname) {
  const [core, site, legacy, configText] = await Promise.all(['umami-analytics-core.js', 'site.js', 'umami-analytics.js', 'umami-config.json'].map(p => readFile(p, 'utf8')));
  const scripts = [], jobs = [], tracked = [], handlers = {};
  const config = JSON.parse(configText);
  const fetch = async () => ({ ok: true, json: async () => config });
  let context;
  const window = { fetch, location: { pathname: '/', hostname } };
  const document = {
    documentElement: { classList: { add() {} }, lang: 'es' },
    head: { appendChild(s) { scripts.push(s); if (s.src === '/umami-analytics.js') jobs.push(Promise.resolve().then(() => vm.runInContext(legacy, context))); } },
    createElement() { return { dataset: {}, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, remove() { scripts.splice(scripts.indexOf(this), 1); } }; },
    querySelector(selector) {
      if (selector.includes('data-personal-trainer-umami-bootstrap')) return scripts.find(s => s.dataset.personalTrainerUmamiBootstrap) || null;
      if (selector.includes('data-umami-tracker')) return scripts.find(s => s.dataset.umamiTracker) || null;
      if (selector.includes('data-umami-analytics-core')) return scripts.find(s => s.dataset.umamiAnalyticsCore) || null;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(name, fn) { handlers[name] = fn; },
  };
  context = vm.createContext({ window, document, fetch, console });
  vm.runInContext(core, context);
  vm.runInContext(site, context);
  await Promise.all(jobs);
  if (window.PersonalTrainerUmami) await window.PersonalTrainerUmami.ready;
  await new Promise(resolve => setImmediate(resolve));
  window.umami = { track: (...args) => tracked.push(args) };
  for (const s of scripts) s.listeners.load?.();
  const link = { dataset: {}, textContent: 'Contactar', getAttribute: () => 'https://wa.me/34634002661', matches: () => false };
  handlers.click({ target: { closest: () => link } });
  return { trackers: scripts.filter(s => s.src === config.scriptSrc), tracked };
}

test('a production page installs one tracker and records one contact conversion', async () => {
  const { trackers, tracked } = await page('personaltrainerfuengirola.com');
  assert.equal(trackers.length, 1);
  assert.equal(trackers[0].dataset.websiteId, 'f712523b-142d-4e87-a2d8-8d09876a04ec');
  assert.equal(trackers[0].dataset.domains, 'personaltrainerfuengirola.com,www.personaltrainerfuengirola.com');
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0][0], 'whatsapp_click');
});

test('preview pages neither install the production tracker nor send conversions', async () => {
  const { trackers, tracked } = await page('preview.example');
  assert.equal(trackers.length, 0);
  assert.equal(tracked.length, 0);
});

test('startup renderer preserves the real production ID without an environment override', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pt-umami-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'config.json');
  const env = { ...process.env, UMAMI_WEBSITE_ID: '', UMAMI_SCRIPT_URL: '', UMAMI_HOST_URL: '', UMAMI_CONFIG_TEMPLATE: 'config/umami-config.template.json', UMAMI_CONFIG_OUTPUT: output };
  execFileSync('sh', ['scripts/render-umami-config.sh'], { env });
  assert.equal(JSON.parse(await readFile(output, 'utf8')).websiteId, 'f712523b-142d-4e87-a2d8-8d09876a04ec');
});

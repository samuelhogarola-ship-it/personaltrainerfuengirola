import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

async function loadCore() {
  const source = await readFile(new URL('../umami-analytics-core.js', import.meta.url), 'utf8');
  const scripts = [];
  const listeners = new Map();
  const document = {
    title: 'Personal Trainer',
    head: {
      appendChild(script) {
        scripts.push(script);
        script.parentNode = this;
      },
      removeChild(script) {
        const index = scripts.indexOf(script);
        if (index >= 0) scripts.splice(index, 1);
      },
    },
    createElement() {
      return {
        dataset: {},
        addEventListener(name, callback) {
          listeners.set(name, callback);
        },
        remove() {
          document.head.removeChild(this);
        },
      };
    },
    querySelector() {
      return scripts[0] || null;
    },
  };
  const window = { location: { pathname: '/blog/', hostname: 'personaltrainerfuengirola.com' } };
  vm.runInNewContext(source, { window, document, console });
  return { api: window.UmamiAnalyticsCore, document, listeners, scripts, window };
}

test('queues conversion events until valid configuration and tracker load', async () => {
  const { api, listeners, scripts, window } = await loadCore();
  const tracked = [];
  api.trackEvent('whatsapp_click', { locale: 'es' });
  assert.equal(scripts.length, 0);

  api.init({ websiteId: 'f712523b-142d-4e87-a2d8-8d09876a04ec' });
  assert.equal(scripts.length, 1);
  window.umami = { track: (...args) => tracked.push(args) };
  listeners.get('load')();
  assert.deepEqual(tracked, [['whatsapp_click', { locale: 'es' }]]);
});

test('removes a failed tracker so a later event can retry', async () => {
  const { api, listeners, scripts } = await loadCore();
  api.init({ websiteId: 'f712523b-142d-4e87-a2d8-8d09876a04ec' });
  assert.equal(scripts.length, 1);
  listeners.get('error')();
  assert.equal(scripts.length, 0);
  api.trackEvent('phone_click');
  assert.equal(scripts.length, 1);
});

test('tracks a custom pageview payload instead of a named event', async () => {
  const { api, window } = await loadCore();
  const tracked = [];
  window.umami = { track: (...args) => tracked.push(args) };
  api.init({ websiteId: 'f712523b-142d-4e87-a2d8-8d09876a04ec' });
  api.trackPageview('/blog/post/', 'Post');
  assert.equal(
    JSON.stringify(tracked.at(-1)),
    JSON.stringify([{ url: '/blog/post/', title: 'Post' }]),
  );
});

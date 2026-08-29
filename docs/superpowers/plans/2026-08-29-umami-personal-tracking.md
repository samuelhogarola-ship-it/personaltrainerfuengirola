# Personal Trainer Fuengirola Umami Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure every Personal Trainer Fuengirola page in the personal Umami instance without cookies.

**Architecture:** The shared `site.js`, already present in all 79 HTML entries, injects one same-origin bootstrap. That bootstrap fetches a public JSON configuration and loads the personal Umami script only when the deployment provides a valid website ID.

**Tech Stack:** Static HTML, browser JavaScript, JSON, Node.js built-in test runner.

**Spec:** https://github.com/samuelhogarola-ship-it/webfuengirola/blob/main/docs/superpowers/specs/2026-08-29-umami-all-panels-design.md

## Global Constraints

- Use only `https://analytics.187.124.55.36.sslip.io`.
- Tracking is anonymous and cookieless and does not wait for consent.
- Missing, malformed, or wrong-host configuration fails closed.
- All 79 HTML entries remain covered through `/site.js`.
- The Umami website ID is public configuration, never a secret.

---

### Task 1: Shared personal Umami bootstrap

**Files:**
- Create: `umami-analytics.js`
- Create: `umami-config.json`
- Create: `tests/umami-analytics.test.mjs`
- Modify: `site.js`

**Interfaces:**
- Consumes: `GET /umami-config.json` with `{ hostUrl: string, websiteId: string }`.
- Produces: `window.PersonalTrainerUmami.init()` and one external tracker element.

- [x] **Step 1: Write the failing test**

```js
test("loads personal Umami and covers every HTML entry", async () => {
  assert.equal(htmlFiles.length, 79);
  assert.deepEqual(htmlWithoutSiteJs, []);
  assert.equal(tracker.src, "https://analytics.187.124.55.36.sslip.io/script.js");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/umami-analytics.test.mjs`

Expected: FAIL because `umami-analytics.js` does not exist.

- [x] **Step 3: Implement the bootstrap and shared loader hook**

```js
var tracker = document.createElement("script");
tracker.defer = true;
tracker.dataset.hostUrl = PERSONAL_HOST;
tracker.dataset.websiteId = websiteId;
tracker.src = PERSONAL_HOST + "/script.js";
document.head.appendChild(tracker);
```

`site.js` injects `<script defer src="/umami-analytics.js" data-personal-trainer-umami-bootstrap="true">` once, independently of every other feature.

- [x] **Step 4: Run verification**

Run: `node --test tests/umami-analytics.test.mjs`

Run: `git diff --check`

Expected: tests PASS and no whitespace errors.

- [x] **Step 5: Commit**

```bash
git add site.js umami-analytics.js umami-config.json tests/umami-analytics.test.mjs docs/superpowers/plans/2026-08-29-umami-personal-tracking.md
git commit -m "feat: add personal Umami tracking"
```

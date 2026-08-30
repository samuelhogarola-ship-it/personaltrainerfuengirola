import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const projectRoot = process.cwd();
const bootstrapPath = path.join(projectRoot, "umami-analytics.js");

function collectHtmlFiles(directory = projectRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

async function runBootstrap(config) {
  const source = readFileSync(bootstrapPath, "utf8");
  const appended = [];
  const document = {
    createElement() {
      return { dataset: {}, defer: false };
    },
    head: {
      appendChild(element) {
        appended.push(element);
      },
    },
    querySelector() {
      return null;
    },
  };
  const window = {};
  const context = vm.createContext({
    console,
    document,
    fetch: async () => ({ json: async () => config, ok: true }),
    window,
  });

  vm.runInContext(source, context);
  await window.PersonalTrainerUmami.ready;
  return appended[0] ?? null;
}

test("loads personal Umami and covers every HTML entry", async () => {
  const htmlFiles = collectHtmlFiles();
  const withoutSiteJs = htmlFiles
    .filter((file) => !readFileSync(file, "utf8").includes('/site.js"'))
    .map((file) => path.relative(projectRoot, file));
  const sharedSiteScript = readFileSync(path.join(projectRoot, "site.js"), "utf8");
  const tracker = await runBootstrap({
    hostUrl: "https://analytics.187.124.55.36.sslip.io",
    websiteId: "personal-trainer-test-id",
  });

  assert.equal(htmlFiles.length, 79);
  assert.deepEqual(withoutSiteJs, []);
  assert.match(sharedSiteScript, /\/umami-analytics\.js/);
  assert.equal(
    tracker.src,
    "https://analytics.187.124.55.36.sslip.io/script.js",
  );
  assert.equal(tracker.dataset.websiteId, "personal-trainer-test-id");
});

test("fails closed without a website id", async () => {
  const tracker = await runBootstrap({
    hostUrl: "https://analytics.187.124.55.36.sslip.io",
    websiteId: "",
  });

  assert.equal(tracker, null);
});

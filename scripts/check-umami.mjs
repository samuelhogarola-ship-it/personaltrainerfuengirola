import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const htmlFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(absolutePath);
    }
  }
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

walk(repoRoot);

assert(htmlFiles.length > 0, "No HTML files found");

const analyticsCorePath = path.join(repoRoot, "umami-analytics-core.js");
assert(existsSync(analyticsCorePath), "Missing umami-analytics-core.js");

const analyticsCore = read("umami-analytics-core.js");
assert(
  analyticsCore.includes("PLACEHOLDER_WEBSITE_IDS") &&
    analyticsCore.includes("REPLACE_WITH_UMAMI_WEBSITE_ID"),
  "Umami loader must treat missing/placeholder website IDs as inert",
);
assert(
  !/data-website-id=["'][0-9a-f-]{20,}["']/i.test(analyticsCore),
  "Umami loader must not hardcode a real website ID",
);

const configTemplate = read("config/umami-config.template.json");
assert(
  configTemplate.includes("__UMAMI_WEBSITE_ID__"),
  "Umami config template must read website ID from deployment env",
);

const localConfig = JSON.parse(read("umami-config.json"));
assert(
  localConfig.websiteId === "f712523b-142d-4e87-a2d8-8d09876a04ec",
  "Tracked umami-config.json must preserve the active Personal Trainer website ID",
);

const renderScript = read("scripts/render-umami-config.sh");
assert(
  renderScript.includes('UMAMI_WEBSITE_ID="${UMAMI_WEBSITE_ID:-}"'),
  "Render script must allow missing UMAMI_WEBSITE_ID without failing",
);

const siteJs = read("site.js");
for (const expected of [
  "initUmamiAnalytics",
  "/umami-config.json",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "contact_form_submit",
  "landing_cta_click",
  "external_booking_click",
]) {
  assert(siteJs.includes(expected), `site.js missing ${expected}`);
}

for (const absolutePath of htmlFiles) {
  const relativePath = path.relative(repoRoot, absolutePath);
  const html = read(relativePath);
  const umamiIndex = html.indexOf('src="/umami-analytics-core.js"');
  const siteIndex = html.indexOf('src="/site.js"');

  assert(siteIndex >= 0, `${relativePath} is missing /site.js`);
  assert(umamiIndex >= 0, `${relativePath} is missing /umami-analytics-core.js`);
  assert(
    umamiIndex < siteIndex,
    `${relativePath} must load umami-analytics-core.js before site.js`,
  );
}

const allTrackedFiles = [
  ...htmlFiles.map((file) => path.relative(repoRoot, file)),
  "site.js",
  "umami-analytics-core.js",
  "umami-config.json",
  "config/umami-config.template.json",
  "scripts/render-umami-config.sh",
];

for (const relativePath of allTrackedFiles) {
  const source = read(relativePath);
  assert(
    !/googletagmanager|google-analytics|gtag\(/i.test(source) &&
      !/GTM-[A-Z0-9]+|UA-\d|G-[A-Z0-9]{6,}/.test(source),
    `${relativePath} contains GA/GTM tracking`,
  );
}

console.log(`Umami checks passed for ${htmlFiles.length} HTML files.`);

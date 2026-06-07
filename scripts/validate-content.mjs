import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALES } from "../content/site-data.js";
import { POSTS } from "../content/posts-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const expectedPostCount = 10;
const errors = [];

if (POSTS.length !== expectedPostCount) {
  errors.push(`Expected ${expectedPostCount} posts, found ${POSTS.length}.`);
}

for (const post of POSTS) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.publishAt)) {
    errors.push(`Invalid publishAt format for ${post.id}: ${post.publishAt}`);
  }

  for (const imagePath of [post.coverImage, post.inlineImage]) {
    const absoluteImage = path.join(rootDir, imagePath.replace(/^\/+/, ""));
    if (!fs.existsSync(absoluteImage)) {
      errors.push(`Missing image for ${post.id}: ${imagePath}`);
    }
  }

  for (const locale of Object.keys(LOCALES)) {
    const translation = post.translations[locale];

    if (!translation) {
      errors.push(`Missing ${locale} translation for ${post.id}`);
      continue;
    }

    const requiredFields = [
      "slug",
      "category",
      "title",
      "metaTitle",
      "metaDescription",
      "excerpt",
      "heroCaption",
      "inlineCaption",
      "imageAlt",
      "bodyHtml"
    ];

    for (const field of requiredFields) {
      if (!translation[field] || typeof translation[field] !== "string") {
        errors.push(`Missing ${field} in ${post.id}/${locale}`);
      }
    }

    if (translation.slug?.includes(" ")) {
      errors.push(`Slug contains spaces in ${post.id}/${locale}: ${translation.slug}`);
    }

    if (!translation.bodyHtml?.includes("{{serviceUrl}}") && !translation.bodyHtml?.includes("{{faqUrl}}") && !translation.bodyHtml?.includes("{{pricingUrl}}") && !translation.bodyHtml?.includes("{{blogUrl}}")) {
      errors.push(`Article body for ${post.id}/${locale} has no internal tokenized link.`);
    }
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${POSTS.length} posts across ${Object.keys(LOCALES).length} locales with all required images present.`);

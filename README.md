# Personal Trainer Fuengirola – Sorvali

Static SEO-focused website for a personal trainer based in Fuengirola, Málaga.

## Stack

Static HTML generated with a small Node build script, shared CSS and a tiny JS helper for scroll reveal and footer year.

## Structure

```text
/content/site-data.js                            Main site copy and route definitions
/content/posts-data.js                           10 scheduled posts x 3 languages
/scripts/build.mjs                               Static generator
/index.html                                      Spanish home (generated)
/en/                                             English pages (generated)
/fi/                                             Finnish pages (generated)
/sobre-sorvali/                                  Spanish about page (generated)
/servicios/entrenamiento-personal-fuengirola/    Spanish service page (generated)
/precios/                                        Spanish pricing page (generated)
/preguntas-frecuentes/                           Spanish FAQ page (generated)
/blog/                                           Blog hub + published Spanish articles (generated)
/legal/index.html                                Legal page kept in Spanish
/assets/images/                                  Site-owned visuals and blog images
/styles.css                                      Shared styles
/site.js                                         Small progressive-enhancement script
/robots.txt                                      Crawl directives
/sitemap.xml                                     Sitemap
```

## Build

```bash
npm run build
```

Preview a future launch date:

```bash
npm run build:date -- 2026-07-04
```

Validate the editorial manifest and image coverage:

```bash
npm run validate:content
```

The build script:

- keeps Spanish in `/`, English in `/en/` and Finnish in `/fi/`
- generates `hreflang`, canonicals, schemas, blog indexes and article pages
- only publishes articles whose `publishAt` is on or before the build date
- rebuilds `robots.txt`, `sitemap.xml` and reusable social cards
- accepts `--date YYYY-MM-DD` or `BUILD_DATE=YYYY-MM-DD` to preview future publication states

## SEO notes

- The main commercial content is now rendered directly in HTML instead of being injected with JavaScript.
- Each public page includes title, meta description, canonical, Open Graph and JSON-LD.
- Blog content is maintained from a single manifest with localized slugs, metadata, article bodies and image references.
- The current canonical base is set to `https://personaltrainerfuengirola.com`.
- If the production domain differs, update canonicals, `og:url`, `robots.txt` and `sitemap.xml`.

## Scheduling

`.github/workflows/publish-scheduled-content.yml` runs daily and commits newly published content back to the repository so the static host can redeploy automatically.

## Deploy

Any static host works — Netlify, Cloudflare Pages, GitHub Pages or similar.

## Contact

WhatsApp: +34 624 04 33 65

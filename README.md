# Personal Trainer Fuengirola – García

Static SEO-focused website for a personal trainer based in Fuengirola, Málaga.

## Stack

Pure HTML, CSS and a tiny JS helper for scroll reveal and footer year.

## Structure

```text
/index.html                                      Home
/sobre-garcia/index.html                        About page
/servicios/entrenamiento-personal-fuengirola/   Main service page
/precios/index.html                              Pricing page
/preguntas-frecuentes/index.html                 FAQ page
/blog/                                           Blog hub + evergreen articles
/legal/index.html                                Legal page
/assets/images/                                  Site-owned SEO/supporting visuals
/styles.css                                      Shared styles
/site.js                                         Small progressive-enhancement script
/robots.txt                                      Crawl directives
/sitemap.xml                                     Sitemap
```

## SEO notes

- The main commercial content is now rendered directly in HTML instead of being injected with JavaScript.
- Each public page includes title, meta description, canonical, Open Graph and JSON-LD.
- The current canonical base is set to `https://personaltrainerfuengirola.com`.
- If the production domain differs, update canonicals, `og:url`, `robots.txt` and `sitemap.xml`.

## Deploy

Any static host works — Netlify, Cloudflare Pages, GitHub Pages or similar.

## Contact

WhatsApp: +34 634 00 26 61

## Content checks

Run `npm run check` before publishing. No dependencies are needed. It checks analytics tests, ES/EN/FI scheduled translations, dates, unique slugs, page language, canonical URLs, titles, descriptions, headings and local image/alternate targets. The catalogue can grow beyond ten posts. Pull requests run the same checks; scheduled publishing validates before and after generation.

The June trilingual PR #3 predates the current García identity, translated pages, scheduled HTML publisher, SEO additions and Umami integration. Its old whole-site generator is not used: it would overwrite those later changes. The current static pages and URLs remain the source of truth. Its useful validation gate is recovered here for the current format; its draft article collection and Sorvali layout remain preserved on the original branch, not silently republished.

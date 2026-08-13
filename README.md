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

# Personal Trainer Fuengirola – Sorvali

Static website for a personal trainer based in Fuengirola, Málaga.

## Stack

Pure HTML + CSS. No build step, no dependencies.

## Structure

```
index.html        – landing page, multilingual copy and SEO metadata
cookie-banner.js  – cookie banner and preference panel
styles.css        – all shared styles
legal/            – legal page shell + legal content adapter
assets/           – local assets for the public site
```

## Legal page

`/legal/` renders as a normal HTML page and keeps the app's own header/footer.

Current status:

- `legal/legal-page.js` owns the multilingual copy and dynamic SEO metadata for the legal route.
- `legal/legal-core.js` provides the shared legal markup renderer used by this static site.
- `legal/legal-core.css` contains the route-specific legal styles layered on top of `styles.css`.

## SEO

- Home and legal routes expose dynamic canonical, Open Graph, Twitter and JSON-LD metadata.
- Language switching is handled with `?lang=es|en|fi`, and alternate language links are updated in the document head.
- Absolute URLs are derived from the current deployment origin, so the site can move between staging and production without hardcoded domain edits.

## Languages

ES 🇪🇸 · EN 🇬🇧 · FI 🇫🇮 — switched client-side via the translation maps in `index.html` and `legal/legal-page.js`.

## Deploy

Any static host works — drag the folder into [Netlify Drop](https://app.netlify.com/drop), Cloudflare Pages, or GitHub Pages.

## Contact

WhatsApp: +34 624 04 33 65

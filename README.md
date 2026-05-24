# Personal Trainer Fuengirola – Sorvali

Static website for a personal trainer based in Fuengirola, Málaga.

## Stack

Pure HTML + CSS. No build step, no dependencies.

## Structure

```
index.html   – markup and JS (services data, i18n, scroll reveal)
styles.css   – all styles
legal/       – /legal route rendered as HTML
```

## Legal page

`/legal` now renders a normal HTML page and keeps the app's own header/footer.

Current status:

- It uses a temporary local adapter in `legal/legal-core.js` with the same API as `createLegalPageMarkup(appConfig)`.
- It loads `legal/legal-core.css` as a temporary copy point for the core legal styles.
- When the shared core package is available to this static app, replace those two files with the published assets and keep `legal/legal-page.js` as the thin app-specific config layer.

## Languages

ES 🇪🇸 · EN 🇬🇧 · FI 🇫🇮 — switched client-side via a translations object in `index.html`.

## Deploy

Any static host works — drag the folder into [Netlify Drop](https://app.netlify.com/drop), Cloudflare Pages, or GitHub Pages.

## Contact

WhatsApp: +34 624 04 33 65

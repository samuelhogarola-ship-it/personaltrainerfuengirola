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

Production remains on Hostinger; the migration to Coolify is pending. The
proposed Node container serves the static site, keeps Blogger content in the persistent volume mounted at
`/app/site-data`, and exposes `/health` plus the protected
`POST /api/blogger/build` hook.

Coolify configuration for the future migration:

- `BLOGGER_BUILD_SECRET`: shared only with WF Studio.
- `UMAMI_WEBSITE_ID`: defaults to the active public ID
  `f712523b-142d-4e87-a2d8-8d09876a04ec` if unset or empty.

Mount the host directory `/data/personal-trainer/site-data` at
`/app/site-data`. WF Studio must mount the same host directory and register it
as the root for `personaltrainerfuengirola`.

The volume also contains `sitemap.xml` and `.blogger-state.json`. Back up the
entire volume, including this private ownership manifest and uploaded media.
Keep a single site writer/replica for this shared volume; build requests within
that process are serialized. Coordinate deployment with Studio publishing.

At startup, release-owned files are refreshed only if they still match their
previous release checksum. Manual edits are preserved. The Spanish blog index
and sitemap retain the Blogger section while accepting updated release content,
including the scheduled ES/EN/FI URLs. English and Finnish pages come directly
from the image. Published Studio posts are reconciled again before serving.

Unpublishing, deleting, or renaming a source removes only its previously
generated `index.html`; uploaded media is retained. Renamed URLs return 404,
without an automatic redirect. A source cannot overwrite a legacy article or
an independently edited generated page: the build fails before publication so
the editor can resolve the collision. Slugs must be unique; if omitted, the
Markdown filename supplies the slug consistently for the page and its URLs.

An existing volume without a manifest is adopted conservatively: unknown files
are preserved, not assumed to be generated. Before migration, reconcile any
pre-existing generated pages with Studio and back them up; a collision requires
explicit editorial resolution. Do not delete the manifest to bypass a conflict.
This local runtime preparation does not deploy, change DNS, or modify Hostinger.

### Umami analytics

The site loads `/umami-analytics-core.js` before `/site.js` on every page. Only
this core installs the tracker; `site.js` no longer injects the legacy bootstrap.
The loader fetches `/umami-config.json` and only tracks on
`personaltrainerfuengirola.com` and `www.personaltrainerfuengirola.com`, using the
personal Umami host. The real website ID is intentionally committed as public
configuration. Missing or invalid browser configuration remains inert; the
container renderer preserves the active production ID when no override is set.

To render the same configuration explicitly, use the current public ID:

```sh
UMAMI_WEBSITE_ID=f712523b-142d-4e87-a2d8-8d09876a04ec ./scripts/render-umami-config.sh
```

`UMAMI_SCRIPT_URL` and `UMAMI_HOST_URL` default to the personal Umami instance
used by Web Fuengirola; the renderer rejects other hosts.

## Contact

WhatsApp: +34 634 00 26 61

## Content checks

Run `npm run check` before publishing. No dependencies are needed. It checks analytics tests, ES/EN/FI scheduled translations, dates, unique slugs, page language, canonical URLs, titles, descriptions, headings and local image/alternate targets. The catalogue can grow beyond ten posts. Pull requests run the same checks; scheduled publishing validates before and after generation.

The June trilingual PR #3 predates the current García identity, translated pages, scheduled HTML publisher, SEO additions and Umami integration. Its old whole-site generator is not used: it would overwrite those later changes. The current static pages and URLs remain the source of truth. Its useful validation gate is recovered here for the current format; its draft article collection and Sorvali layout remain preserved on the original branch, not silently republished.

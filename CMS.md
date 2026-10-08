# Content management

The Arabic dashboard is at `/admin`. It manages the six public pages, site
description and sharing image, ventures, articles, statistics, timelines, and
uploaded images. Existing content remains the default until published.

## Language and appearance

The language selector on the login screen and dashboard switches the CMS
interface between Arabic (RTL) and English (LTR), including field labels,
actions, confirmation dialogs, messages, and dates. Content being edited stays
as authored; changing the interface language does not translate website text.

Light/dark controls are available in the CMS. The public site's header includes
a theme toggle, also available on mobile. Each surface stores its own theme in
a browser cookie; the CMS language is stored separately. Saved preferences are
read on the server before rendering to avoid a flash of the wrong theme.

## Run locally

1. Use Node.js >=22.13 and `npm.cmd ci` on Windows (`npm ci` elsewhere).
2. Copy `.dev.vars.example` to `.dev.vars`.
3. Set a unique `CMS_ADMIN_PASSWORD` of at least 12 characters and a random
   `CMS_SESSION_SECRET` of at least 32 characters. Never commit `.dev.vars`.
4. Run `npm.cmd run dev` and open the printed URL followed by `/admin`.

The Cloudflare Vite plugin simulates `DB` (D1) and `MEDIA` (R2) locally. Content
and images persist in ignored `.wrangler/state/` across server restarts. Tables
are created automatically. Back up this folder before deleting it. Local data
is separate from production data.

In this workspace dependencies are installed on drive D and linked through
`node_modules` to avoid filling C. A fresh checkout can use a normal `npm ci`
when space is available. Local credentials have been generated in `.dev.vars`.

## Editing workflow

- Edit page fields or add, edit, remove, and reorder list entries.
- Upload JPG, PNG, WebP, or GIF images up to 5 MB. Choose uploaded pictures
  or bundled images from any image field.
- Save the draft. Saving does not change the public website.
- Preview the saved draft in a new tab using your admin session.
- Publish to replace the public content with the saved draft.
- Articles with body text get detail pages. Empty bodies keep list-only titles.
- Concurrent stale saves are rejected. Copy unsaved work to a safe place,
  then reload before retrying.

The original contact form had no delivery backend. It now opens the visitor's
email app using the CMS contact address; it does not send mail itself.

## Node and Render

For Node development use `npm.cmd run dev:node`. This selects SQLite and local
image files rather than Cloudflare bindings. Data defaults to ignored
`.cms-data/`. Keep that directory when restarting or rebuilding.

For production:

```sh
npm ci
npm run build:node
npm run start:node
```

Set `CMS_ADMIN_PASSWORD` and `CMS_SESSION_SECRET` as server environment
variables. Set `CMS_DATA_DIR` to a persistent writable directory. On Render,
attach a persistent disk and set, for example,
`CMS_DATA_DIR=/var/data/maamoun-cms`. Without a persistent disk, redeploys may
erase content and uploaded images. Run one application instance with this
SQLite adapter. Back up the full data directory, including uploaded images,
using SQLite's backup tools or while the service is stopped.

Cloudflare and Node builds have different output shapes. Always use a matching
build/start pair. Changing storage drivers does not migrate existing content.

## Cloudflare production configuration

This CMS uses Cloudflare D1 and R2. Production must supply a persistent database
as `DB`, a bucket as `MEDIA`, and both admin secrets. Binding names in
`.openai/hosting.json` alone do not provision these resources.

Update the canonical URL in site settings when changing the production host.

Sessions use signed, HttpOnly, SameSite=Strict cookies, Secure on HTTPS, with
eight-hour expiry. Password or secret changes invalidate all sessions. Writes
require same-origin requests. Login is limited to 10 attempts per 15 minutes
globally for this single-administrator dashboard. Image signatures are checked;
SVG is not accepted. Uploaded image URLs are public.

There is no media deletion in this version, so replacing a picture preserves
older published links. Multi-user roles and revision history are not included.

## Verification

```powershell
npm.cmd run lint
npm.cmd run build
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run test:cms
npm.cmd run test:cms:node
```

The CMS integration suite checks authentication, draft/public separation,
publishing, conflicts, and image upload restrictions against an isolated local
development server. It does not modify the normal local CMS content.

References: [D1 API](https://developers.cloudflare.com/d1/worker-api/) and
[route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).

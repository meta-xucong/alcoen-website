# Execution Plan

## Goal

Bring the project onto the captured target-site structure by making the runtime code fully compatible with the current canonical data model in `data/site.json`.

This first plan covers the critical stabilization path:

1. Refactor `server.js` to use the new schema
2. Restore correct front-end rendering on top of that schema
3. Rebuild the admin so it edits the same schema safely
4. Verify routes, save flow, and upload flow

## Current State

- `data/site.json` already uses the reconstructed top-level model:
  - `site`
  - `company`
  - `contentSorts`
  - `singles`
  - `news`
  - `products`
  - `slides`
  - `links`
  - `meta`
- `server.js` still expects the older simplified model:
  - `siteName`
  - `tagline`
  - `heroSlides`
  - `about`
  - `categories`
  - `downloads`
  - `contact`
  - `footer`
- `public/admin.js` also still edits the older simplified model.
- As a result, the current app is structurally inconsistent and is at risk of rendering wrong data or breaking save/edit flows.

## Assumptions

- `data/site.json` is now the canonical source of truth.
- `tmp-admin/crawl-report.json` and `tmp-admin/menus.json` are the best available evidence for field names and content relationships.
- Phase one does not require a 1:1 visual clone of the original admin UI, but it does require a matching information architecture and editable field model.
- The server should remain a simple Node HTTP server unless a later plan explicitly changes that.

## Risks

- Old save logic may overwrite or strip fields from the new schema if reused without normalization updates.
- Front-end templates may silently show incorrect relationships if category and single-page lookups are not rebuilt carefully.
- Some imported target content contains encoding artifacts; these must be preserved safely for now unless a specific cleanup pass is planned.
- Admin rebuild work will touch a wide surface area and can easily drift from the captured content model if done without shared helpers.

## Step 1: Server-Side Schema Stabilization

Status: pending

Tasks:

- Replace old-schema normalization in `server.js` with new-schema normalization.
- Add default-safe normalizers for:
  - `site`
  - `company`
  - `contentSorts`
  - `singles`
  - `news`
  - `products`
  - `slides`
  - `links`
  - `meta`
- Add helper selectors for:
  - top-level navigation categories
  - child product categories
  - single-page lookup by sort or filename
  - product lookup by slug
  - news lookup by slug
  - active and sorted content filtering
- Ensure `/api/site` reads and writes the new schema without dropping fields.

## Step 2: Front-End Route Reconstruction

Status: pending

Tasks:

- Rebuild the home page from:
  - `slides`
  - `company`
  - featured `products`
  - `news`
  - footer/navigation derived from `contentSorts`
- Rebuild:
  - `/about`
  - `/downloads`
  - `/contact`
  using `singles`
- Rebuild `/products` using `contentSorts` plus `products`
- Rebuild `/products/:slug` using the product detail model
- Rebuild `/news` and `/news/:slug` using the news model
- Keep `/guestbook` as a safe alias until a dedicated guestbook implementation exists

## Step 3: Admin Reconstruction

Status: pending

Tasks:

- Replace old simplified admin sections with schema-aligned modules:
  - Site
  - Company
  - Content categories
  - Single pages
  - News
  - Products
  - Slides
  - Links
- Preserve advanced JSON editing for fallback/debugging.
- Preserve upload support and automatic field fill after upload.
- Ensure save operations do not corrupt unrelated sections.

## Step 4: Verification

Status: pending

Tasks:

- Run `node --check server.js`
- Start the app with `node server.js`
- Verify these routes return `200`:
  - `/`
  - `/about`
  - `/products`
  - `/news`
  - `/downloads`
  - `/contact`
  - `/guestbook`
  - `/admin`
- Verify:
  - `GET /api/site`
  - `POST /api/site`
  - `POST /api/upload`
- Confirm that an admin edit is reflected on the front end

## Implementation Order

Work should proceed in this order without skipping:

1. `server.js`
2. Front-end rendering logic and templates
3. `public/admin.html` and `public/admin.js`
4. `public/styles.css` adjustments required to support the rebuilt structure
5. End-to-end verification

## Progress Log

- 2026-03-27: Created initial root `PLANS.md` to govern the first full schema-alignment refactor.
- 2026-03-30: Added admin reconstruction execution plan focused on front-end mapping clarity and reusable content templates.

---

## 2026-03-30 Admin UX Reconstruction Plan

### Goal

Make the admin structurally intuitive so non-technical editors can clearly understand which back-end parameter controls which front-end module, while enabling reusable visual content templates for products/news/company pages in both Chinese and English.

### Current State

- `public/admin.js` is missing, causing admin logic failure.
- `public/admin.html` exists but has partial text encoding issues and no active runtime logic.
- `server.js` already supports canonical schema and template block rendering:
  - `layoutBlocks`
  - `layoutBlocksZh`
  - template style fields (font/size/color/position/background/overlay)

### Assumptions

- Preserve the single shared schema (`data/site.json`) as the only source of truth.
- Keep admin editing and front-end rendering consistent through existing `/api/site`.
- Reuse server-side template fields rather than introducing a second template system.

### Risks

- Large admin script edits can fail on Windows command length limits.
- Missing defaults on nested arrays/objects may break rendering or saves.
- Chinese localization can regress if string resources are not centrally managed.

### Ordered Implementation Steps

1. Rebuild `public/admin.js` with:
   - section-based IA aligned to schema modules
   - explicit per-field “front-end mapping” labels
   - CRUD/sort/status controls for list-based modules
   - reusable template block editor for `layoutBlocks` and `layoutBlocksZh`
   - preset template insertion (hero/split/banner/text)
2. Fix `public/admin.html` text and language switch labels.
3. Extend `public/styles.css` for:
   - section guide cards
   - mapping badges
   - template editor layout
4. Run static checks and end-to-end verification.
5. Start local server for acceptance preview.

### Verification Steps

- `node --check server.js`
- `node --check public/admin.js`
- Start app with `node server.js`
- Verify route status code `200`:
  - `/`
  - `/about`
  - `/products`
  - `/news`
  - `/downloads`
  - `/contact`
  - `/guestbook`
  - `/admin`
- Verify:
  - `GET /api/site`
  - `POST /api/site`
  - `POST /api/upload`
- Perform manual admin smoke checks:
  - edit field and save
  - add/remove item in news/products
  - add template block and confirm front-end reflection

### Status

- Step 1: completed
- Step 2: completed
- Step 3: completed
- Step 4: completed
- Step 5: completed

### Progress Notes

- Rebuilt `public/admin.js` from scratch with schema-aligned sections and explicit field-to-frontend mapping hints.
- Added reusable template block editor for `layoutBlocks` and `layoutBlocksZh` with preset insertion and full style controls (font/size/color/position/overlay).
- Fixed `public/admin.html` language label rendering (`中文`) and preserved advanced JSON mode + upload workflow.
- Extended `public/styles.css` for guide cards, mapping badges, template editor UI, and notice states.
- Updated `server.js` English title-bar image mapping so non-home pages also show section images in English mode.
- Completed route/API/upload verification and restarted local server for acceptance.

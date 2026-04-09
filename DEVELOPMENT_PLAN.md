# Development Plan

## Goal

Rebuild the ALCOCHROM corporate website with:

- a front end that matches the captured target-site structure
- an editable admin
- a shared data model for front end and admin

## Confirmed Architecture

- The target admin follows a `PbootCMS`-like information architecture.
- The locally captured evidence is stored in `tmp-admin/`.
- The runtime content store is `data/site.json`.

## Required Front-End Pages

- `/`
- `/about`
- `/products`
- `/products/:slug`
- `/news`
- `/news/:slug`
- `/downloads`
- `/contact`
- `/guestbook`

## Required Admin Modules

- Site information
- Company information
- Content categories
- Single pages
- News
- Products
- Slides
- Friendly links
- Media upload

## Canonical Data Shape

`data/site.json` should remain centered around:

- `site`
- `company`
- `contentSorts`
- `singles`
- `news`
- `products`
- `slides`
- `links`
- `meta`

## Delivery Order

1. Stabilize `server.js` around the current schema
2. Rebuild the front-end structure from the captured site model
3. Rebuild the admin around the real content model
4. Refine styles and interactions
5. Run route, save, upload, and regression checks

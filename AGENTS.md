# Repository Guidelines

## Scope

This file applies to the entire repository. If a deeper directory later adds its own `AGENTS.md`, the deeper file overrides this one for files under that subtree.

## Product Goal

Build a fully editable corporate website that faithfully reconstructs the structure of [alcochrom.com](https://www.alcochrom.com/) while using our own implementation.

The priority order is:

1. Reconstruct the real site architecture and data model
2. Make the front end and admin use the same source of truth
3. Ensure the admin can safely edit all visible content
4. Refine visual fidelity after structure and editing are stable

## Non-Negotiable Boundaries

- Do not copy the target site's source code or backend code.
- It is acceptable to reconstruct page structure, information architecture, field schema, and content organization based on observed behavior and admin screenshots/pages already captured for this project.
- Treat `tmp-admin/` as read-only reverse-engineering evidence, not as runtime code.
- Do not replace the shared data model with page-local hardcoded content.
- Do not revert user changes unless the user explicitly asks for that.

## Sources Of Truth

When making decisions, use these sources in order:

1. `DEVELOPMENT_PLAN.md`
2. `data/site.json`
3. `tmp-admin/crawl-report.json`
4. `tmp-admin/menus.json`
5. Current runtime code in `server.js` and `public/`

If these disagree, align implementation with the planning document and the captured backend structure, then update the code accordingly.

## Required Working Style

For any non-trivial task, work in this order:

1. Read the affected files and current data shape first.
2. If the task spans multiple files, major refactors, or schema changes, create or update a root `PLANS.md` before editing.
3. Make the smallest coherent end-to-end change that leaves the app runnable.
4. Verify behavior with commands or route checks.
5. Report what changed, what was verified, and any remaining risk.

## ExecPlans Requirement

Follow OpenAI Codex guidance for execution plans:

- Use `PLANS.md` for complex work, multi-step refactors, backend schema changes, or any task expected to take more than a short edit cycle.
- `PLANS.md` should include:
  - Goal
  - Current state
  - Assumptions
  - Risks
  - Ordered implementation steps
  - Verification steps
  - Status updates as work progresses
- Keep the plan short but actionable.
- Update the plan when scope changes.

## Repository Architecture

- `server.js`
  - Current Node.js HTTP server entrypoint
  - Must remain the single source of route handling unless a deliberate refactor changes that
- `public/`
  - Static assets and admin UI
  - `admin.html` and `admin.js` are the current admin entrypoints
- `data/site.json`
  - Canonical content store for the site
- `tmp-admin/`
  - Captured target-site backend pages and extracted field structure
- `scripts/`
  - One-off probes, crawlers, or migration helpers

## Canonical Data Model

`data/site.json` must remain centered around these top-level keys:

- `site`
- `company`
- `contentSorts`
- `singles`
- `news`
- `products`
- `slides`
- `links`
- `meta`

Implementation rules:

- Front end and admin must both read from this structure.
- Schema normalization must happen server-side before rendering or saving.
- Missing fields must be auto-filled with safe defaults.
- Sorting and status flags must be respected consistently.
- Slugs and route mapping must be deterministic.

## Required Front-End Information Architecture

The site must support these pages:

- `/`
- `/about`
- `/products`
- `/products/:slug`
- `/news`
- `/news/:slug`
- `/downloads`
- `/contact`
- `/guestbook`

Required primary navigation:

- `ABOUT`
- `PRODUCT`
- `NEWS`
- `DOWNLOAD`
- `CONTACT`

Required product category structure:

- `Pharmaceutical`
- `Column`
- `Silica`
- `Accessories`

## Required Admin Information Architecture

The admin must support, at minimum:

- Site information
- Company information
- Content categories
- Single pages
- News
- Products
- Slides
- Friendly links
- Media upload
- JSON fallback editor/debug area

Required editing capabilities:

- List
- Create
- Edit
- Delete
- Sort
- Toggle status
- Upload image
- Upload attachment
- Save without corrupting unrelated sections

## Implementation Rules

- Preserve backward safety while migrating old code to the new schema.
- Prefer shared helper functions for normalization, slug lookup, sorting, and rendering data selection.
- Do not hardcode page text in templates if that text belongs in `data/site.json`.
- Keep HTML escaping and rich-text rendering rules explicit.
- Add concise comments only where logic is not obvious.
- If a schema change is introduced, update:
  - `data/site.json`
  - server normalization logic
  - admin editing logic
  - any affected front-end rendering
  - the planning document if the change affects architecture

## Reverse-Engineering Rules

- Use captured pages in `tmp-admin/` to infer field names, menu structure, model relationships, and required templates.
- Do not assume the current simplified implementation is correct.
- Prefer matching the observed backend model over preserving older local shortcuts.

## Verification Rules

After meaningful changes, verify as many of these as applicable:

- `node --check server.js`
- Start the app with `node server.js`
- Confirm main routes return `200`
- Confirm `/api/site` read works
- Confirm `/api/site` save works
- Confirm `/api/upload` works when touched
- Confirm admin edits still render correctly on the front end

If something could not be verified, say so explicitly.

## Front-End Fidelity Rules

During UI work:

- Match structure first, styling second, polish third.
- Preserve the target site's page hierarchy and module ordering.
- Avoid generic redesigns that drift from the captured reference.
- Keep desktop and mobile layouts both functional.

## Admin UX Rules

- Prefer form-based editing for normal use.
- Keep a JSON advanced mode for debugging and bulk correction.
- Upload success should immediately populate the relevant field.
- Saving should provide clear success or failure feedback.

## File Encoding

- Markdown and source files should be UTF-8.
- When a Chinese document may be opened in Windows editors, UTF-8 with BOM is acceptable.
- Do not introduce mixed encodings in the repository.

## What To Do Next By Default

Unless the user asks for a different priority, continue work in this order:

1. Normalize and stabilize `server.js` around the current schema
2. Rebuild the front-end page skeleton around real captured structure
3. Rebuild the admin UI to match the real content model
4. Refine styles and run regression checks

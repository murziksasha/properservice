# AGENTS.md

Instructions for coding agents working in this repo. The app root is this directory (`package.json` is `"private": true` — do not publish it).

Proper Service is a marketing site and file-based CMS for a repair shop in Chornomorsk. Stack: Next.js 15 App Router, React 19, TypeScript, Sass. There is no database.

Deeper detail lives in [docs/architecture.md](docs/architecture.md), [docs/deploy.md](docs/deploy.md), and [docs/admin-guide.md](docs/admin-guide.md). Read those before a large change. Do not duplicate them here.

## Commands

```bash
npm run dev            # http://localhost:3000 and /admin
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest, once
npm run format:check   # prettier
npm run test:smoke     # playwright smoke (starts next dev if needed)
```

CI on every pull request runs format, lint, typecheck, unit tests, `npm run build`, and e2e. Match that bar for the files you touch. Run `npm run format` on edited files before finishing.

Do not start Docker, pm2, or a production build unless the task is deploy or runtime.

## Layout

| Path                                                          | What belongs here                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `app/(public)/`                                               | Public routes. Home is slug `''`. Other CMS pages are `[slug]`. Shop is `/shop` and `/shop/[id]`. |
| `app/admin/`                                                  | Admin UI. Editors are client components under `components/admin/`.                                |
| `app/api/`                                                    | Route handlers. Admin APIs check the session in Node, not only in middleware.                     |
| `components/sections/`                                        | One component per CMS section. Wired by `SectionRenderer`.                                        |
| `components/shop/`, `components/forms/`, `components/layout/` | Catalog, callback/order forms, public chrome.                                                     |
| `lib/`                                                        | Domain logic, Zod validation, file IO. Unit tests sit next to the module: `lib/foo.test.ts`.      |
| `lib/types.ts`                                                | `SiteData` and the `Section` union. Change the type, the Zod schema, and the renderer together.   |
| `lib/site-data.ts`                                            | Read/write `data/site.json`. All content writes go through this (atomic write).                   |
| `styles/` and `src/sass/`                                     | Global, theme, shop, motion, and admin Sass. Public entry is `styles/globals.scss`.               |
| `data/`                                                       | Runtime JSON. Content is `site.json`. Journals are separate files.                                |
| `e2e/`                                                        | Playwright. Excluded from `tsconfig.json`.                                                        |
| `mailer/`                                                     | Legacy PHP. The site does not call it. Leave it alone unless the task is that mailer.             |

Import app code with the `@/` alias (`@/lib/...`, `@/components/...`).

## Content and journals

- All page content is one `SiteData` document in `data/site.json` (`DATA_DIR` overrides the directory). `data/site.example.json` serves as the tracked seed template.
- `PUT /api/site` replaces the document and returns **409** when `updatedAt` does not match. `PATCH /api/site` updates one section (`goods`, `settings`, `headerMenu`, `servicesNav`, `pages`, `shopLink`) with the same lock.
- Writes use `lib/atomic-write.ts` (temp file + rename). Do not replace that with a bare `writeFile` of JSON.
- Leads (`data/leads.json`, callback) and orders (`data/orders.json`, shop) are separate from `site.json` and from each other. Cap is about 500 rows.
- Runtime data stores (`data/*.json`, including `site.json`, `leads.json`, `orders.json`, `admin-totp.json`, `media-index.json`, `admin-activity.json`, `admin-sessions.json`) and `data/backups/` are gitignored. Only `data/site.example.json` is committed. Do not commit live data.
- Public HTML from the CMS must pass `sanitizeHtml()` before `dangerouslySetInnerHTML`.

## Auth and public forms

- `middleware.ts` only checks that the `admin_session` cookie exists, plus the optional `ADMIN_IP_ALLOWLIST`. HMAC verification runs in Node (`lib/session.ts`, admin layout, route handlers). Edge middleware does not see Docker runtime secrets reliably — do not move the HMAC check into middleware.
- Login is `POST /api/auth` (timing-safe password, optional TOTP). Session cookie is httpOnly and HMAC-signed.
- Callback: `POST /api/contact`. Shop order: `POST /api/orders`, only from the product page, quantity always 1. Both use honeypot field `website` (soft success, nothing stored) and Ukrainian phone validation in `lib/phone.ts` (`380` + 9 digits, or `0` + 9).
- Rate limits are in-memory (`lib/rate-limit.ts`) and assume one process. A 429 body is `{ error, retryAfter }` plus a `Retry-After` header. Keep the client countdown/toast behavior in `lib/admin/rateLimitUi.ts`.
- Uploads: `POST /api/upload` checks magic bytes, then sharp. Presets live in `lib/image-presets.ts`. Files land in `public/uploads/` (or `UPLOADS_DIR`).

## Conventions

- UI copy is Ukrainian. Code, identifiers, and comments are English.
- Prettier: single quotes, `arrowParens: avoid`, print width 120, 2-space indent. See `.prettierrc`.
- TypeScript is `strict`. Prefer a real type over `any`. Unused names start with `_`.
- Add or extend a `lib/*.test.ts` when you change parsing, validation, phone, catalog, auth, or file-format logic. Vitest config is `vitest.config.ts`.
- Public pages are `force-dynamic` because the CMS is a file. Do not cache admin or API responses in `public/sw.js`.
- Styling is Sass, not CSS-in-JS. Reuse existing blocks before adding a new partial.
- Admin shell is viewport-locked: only `admin-main` scrolls. Do not break that to fix a single page.
- Cookie consent is per device (`lib/cookie-consent.ts`). Gincore widgets load only after the visitor accepts optional cookies.

## Leave untouched unless the task says so

- `.env` and secrets (`ADMIN_PASSWORD`, `SESSION_SECRET`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`, `ADMIN_TOTP_SECRET`, `BACKUP_CRON_SECRET`). Copy names from `.env.example` only.
- `public/uploads/**` binaries and `data/*.json` runtime stores.
- `mailer/phpmailer/**` and the legacy PHP mailer.
- `node_modules/`, `.next/`, and generated Playwright reports.

Do not add a database, a second content store, or a new auth scheme for a local feature. This deploy is single-instance.

## When you change UI

Exercise the changed flow in a browser (click, type, submit, navigate), including the other screens that share the component or the saved data. For layout changes, check a desktop width and a phone width. Admin and the public site are different chrome — a public change must not appear under `/admin`, and the reverse.

If no browser is available, say what you could not verify. `npm run test:smoke` covers home, health, shop, cookie banner, and admin login.

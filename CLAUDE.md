# eCivil — Plateforme Unifiée de la Citoyenneté Numérique

Guidance for Claude Code working in this repository.

---

## 1. What we are building

eCivil is a GovTech platform (Mali) acting as a **guichet unique virtuel**: one place where a
citizen requests, pays for, tracks and receives official documents. The keystone is the
**NINA** number (Numéro d'Identification National), which chains every request to a single
verified identity.

Source of truth for requirements: `Fiche de Projet eCivil.pdf` (in this folder).

**Three actors:**

| Actor | Needs |
| --- | --- |
| Citizen (resident + diaspora) | Request documents, pay, track status, receive them |
| Public agent | Review and validate/reject requests in a back-office |
| Admin | Manage agents, services, tariffs, view statistics |

**Four service modules** (from the PDF):

| Module | Services | State partner |
| --- | --- | --- |
| Identité & Voyage | Passport, biometric ID card (new + renewal) | Ministère de la Sécurité |
| Événements de Vie | Birth & marriage certificate declaration/extraction | Communes & Consulats |
| Mobilité Urbaine | Vehicle registration, carte grise | Direction des Transports |
| Titres Fonciers | Property deeds, cadastral verification | Urbanisme & Domaines |

**Citizen journey (the 5 steps we must demo end to end):**
1. Strong auth — NINA + SMS OTP
2. Smart form — fields pre-filled from the national identity registry
3. Integrated payment — Mobile Money (Orange Money, Wave) or bank card
4. Processing & notification — agent validates in back-office, citizen notified by SMS/Email
5. Modern delivery — digital document with a security QR code, or physical delivery

**Strategic goals to keep visible in the UI:** zero travel, mobile-first accessibility,
transparent official tariffs, centralized sovereign data, fraud prevention via NINA chaining.

---

## 2. Prototype scope and honesty rules

This is a **prototype/demo**, not a production government system. These rules are not
negotiable:

- **No real integration** with any government registry, payment provider, or SMS gateway.
  Every external dependency is a clearly-labelled mock behind an adapter interface.
- **Mock NINA registry** = a seeded MongoDB collection of fake citizens. Never use real
  NINA numbers or real personal data, including your own. Seed data is obviously fictional.
- **Generated documents are demo artifacts.** Every PDF we produce carries a visible
  `SPÉCIMEN — PROTOTYPE / SANS VALEUR LÉGALE` watermark, and the QR code resolves to a demo
  verification page that says so. We do not produce anything that could pass as a genuine
  official document.
- **OTP in dev** is printed to the server log and returned in the response only when
  `NODE_ENV !== 'production'`. Never in production mode.
- Security posture is real even if the integrations are fake: hashed secrets, JWT with
  short expiry, rate limiting, server-side authorization checks on every route.

When a demo shortcut is taken, mark it `// MOCK:` in code so the boundary stays obvious.

**File storage is real, and self-hosted** — MinIO (S3-compatible) in Docker, see §3. Unlike a
third-party CDN, nothing leaves the machine, and the same software can run on the sovereign
national cloud the PDF §6 requires. Storage is therefore *not* a deviation from the target
architecture; only the deployment location changes later.

Even so, the data rules stand:

- **Nothing but fictional data is ever uploaded.** No real ID scans, no real photos, no
  personal documents — not the user's own, not anyone's. Demo attachments are obviously
  synthetic placeholder files. Self-hosting lowers the blast radius; it does not make real
  citizen data acceptable in a prototype.
- **The bucket is private.** Anonymous access is set to `none`. Citizen documents are served
  only through short-lived presigned URLs generated server-side per request. Never store or
  return a durable public URL for a document.
- **The API authenticates as a scoped user, never as MinIO root.** The `ecivil-app` user's
  policy allows Get/Put/Delete on the one bucket and nothing else — no bucket creation, no
  admin. Root credentials are for the console only.
- **Every upload goes through the storage adapter**, never an S3 client called directly from
  a service or controller. One chokepoint for validation, and the seam that keeps a future
  move (managed S3, sovereign cloud) a single-file change.
- **Validate before upload:** allowlist MIME types (`image/jpeg`, `image/png`,
  `application/pdf`), cap size (5 MB), and generate our own object key — never trust the
  client filename.
- Credentials live in env vars, server-side only. The frontend never holds a secret and
  never uploads directly to MinIO; it posts to the API, which relays.

---

## 3. Tech stack

**Web frontend** — React 18 + Vite, `.jsx` components, TailwindCSS, React Router,
TanStack Query (server state), react-hook-form + zod (forms), axios, i18next.
**Backend** — Node.js + Express, MongoDB + Mongoose, JWT auth, zod validation,
pdfkit (documents), qrcode, multer (upload parsing) + MinIO (self-hosted S3-compatible
object storage), pino (logs), vitest + supertest.
**API docs** — OpenAPI 3 spec (hand-authored in `backend/src/docs/`) served via Swagger UI at
`/api/docs`. When you add or change an endpoint, update the spec in the same commit.
**Infrastructure** — Docker Compose runs MongoDB and MinIO locally. MinIO console on
`:9001`, S3 API on `:9000`; credentials in the gitignored root `.env`.
**Mobile** (phase 2, after web validation) — React Native (Expo), reusing the same API.
**Future** — backend rewrite in Rust. Keep business logic in service modules, not in
Express handlers, so the port has a clean seam.

**UI language is French.** All user-facing copy is French (i18next keys, `fr` default).
Code, comments, commit messages and this file are English.

---

## 4. Architecture

```
e-civil/
├── backend/
│   ├── src/
│   │   ├── config/          # env, db connection
│   │   ├── models/          # Mongoose schemas
│   │   ├── modules/         # one folder per domain: auth, citizens, requests,
│   │   │                    #   payments, documents, admin
│   │   │   └── <name>/      # <name>.routes.js | .controller.js | .service.js | .schema.js
│   │   ├── adapters/        # external boundaries: ninaRegistry (MOCK), sms (MOCK),
│   │   │                    #   payment (MOCK), storage (REAL — MinIO/S3)
│   │   ├── middleware/      # auth, rbac, errorHandler, rateLimit, upload
│   │   ├── docs/            # OpenAPI spec + Swagger UI route (served at /api/docs)
│   │   ├── constants/       # shared enums: roles, statuses, module keys
│   │   ├── utils/
│   │   └── app.js | server.js
│   ├── tests/
│   └── seeds/               # fictional citizens, services, tariffs, demo accounts
├── frontend/                # SINGLE app — citizens + role-gated back-office
│   └── src/
│       ├── pages/           # citizen routes: Home, Login, Dashboard, Services,
│       │                    #   RequestWizard, Tracking, Verify
│       ├── admin/           # back-office area, gated by role (AGENT/ADMIN/SUPER_ADMIN):
│       │                    #   AgentInbox, ModuleAdmin, SuperAdmin dashboards
│       ├── components/      # reusable .jsx
│       ├── features/        # per-module UI + api hooks (auth shared across both areas)
│       ├── lib/             # axios client, auth context, helpers (extractable later)
│       └── locales/fr/
├── mobile/                  # phase 2
└── docs/
```

The back-office lives under `/admin` in the same Vite app, shown only to staff roles. Shared
code (API client, auth) is kept isolated so a separate staff app can be split out later
without a rewrite — a deliberate deferral, see §6 "Later".

**Layering rule:** `routes → controller → service → model`. Controllers do HTTP only.
Services hold business rules and never import Express. This is the seam for the Rust port.

**Request state machine** — the core domain object. A `Request` moves:

```
DRAFT → SUBMITTED → PENDING_PAYMENT → PAID → UNDER_REVIEW
      → APPROVED → ISSUED → DELIVERED
      ↘ REJECTED    ↘ NEEDS_INFO → (back to SUBMITTED)
```

Every transition is appended to a `timeline[]` on the request (actor, from, to, note, at)
and triggers a notification. Transitions are validated server-side — never trust a
client-sent status.

**Roles — a four-tier hierarchy.** Authorization is checked in middleware on every non-public
route; `moduleScope[]` is the mechanism for the two scoped roles.

| Role | Scope | Does |
| --- | --- | --- |
| `CITIZEN` | self | Submit, pay for and track their own requests |
| `AGENT` | one module | Process (approve / reject / ask info) individual requests in their module |
| `ADMIN` | one module | Run one module: manage its agents, services, tariffs; module stats |
| `SUPER_ADMIN` | global | The platform operators (us): all modules, manage admins, system-wide stats & config |

The module→partner mapping is institutional, not cosmetic: Identité & Voyage → Ministère de
la Sécurité, Événements de Vie → Communes & Consulats, Mobilité Urbaine → Direction des
Transports, Titres Fonciers → Urbanisme & Domaines. Each partner administration owns its
module via an `ADMIN`; `SUPER_ADMIN` sits above all four. `AGENT` *works* requests; `ADMIN`
*runs* the module — distinct roles. Empty `moduleScope` on a `SUPER_ADMIN` means global.

---

## 5. Data model (first pass)

- **Citizen** — nina (unique, indexed), firstName, lastName, birthDate, birthPlace, gender,
  phone, email, address, isDiaspora, consulate, photoUrl, passwordHash?, createdAt
- **Service** — code, moduleKey, label (fr), description, requiredDocuments[], fee, currency,
  processingDays, isActive
- **Request** — reference (human-readable, e.g. `ECV-2026-000123`), citizenId, serviceId,
  moduleKey, status, formData (mixed), attachments[], payment{}, timeline[], assignedAgentId,
  documentId, createdAt, updatedAt
- **Attachment** (embedded in Request) — storageKey (the S3 object key), mimeType, sizeBytes,
  originalName (sanitized, display only), uploadedBy, uploadedAt.
  Store the key, never a URL — URLs are presigned on read.
- **Payment** — requestId, provider (`ORANGE_MONEY`|`WAVE`|`CARD`), amount, currency, status,
  providerRef, paidAt
- **Document** — requestId, type, storageKey, qrToken (unique), issuedAt, expiresAt,
  isRevoked
- **Notification** — citizenId, channel (`SMS`|`EMAIL`), template, payload, status, sentAt
- **User** (back-office: agent/admin/super-admin) — email, fullName, passwordHash, role
  (`AGENT`|`ADMIN`|`SUPER_ADMIN`), moduleScope[] (empty = global, for SUPER_ADMIN), isActive
- **AuditLog** — actorId, action, entity, entityId, meta, at

Public verification endpoint: `GET /verify/:qrToken` → returns validity + issuing info +
the prototype disclaimer. No auth, rate-limited.

---

## 6. Roadmap — A to Z

Each step ends with a **commit message** for you to use (the user commits; Claude never runs
`git commit`). Conventional Commits, imperative mood.

### Phase 0 — Foundations
1. Repo skeleton (`backend/`, `frontend/`, `docs/`), root README, `.gitignore`, `.editorconfig`
   → `chore: scaffold monorepo structure and tooling config`
2. Backend boot: Express app, env config, Mongo connection, `/health`, error handler, pino
   → `feat(backend): bootstrap express server with mongodb connection and health check`
3. Frontend boot: Vite + React + Tailwind, router, layout shell, French i18n setup
   → `feat(frontend): bootstrap vite react app with tailwind and french i18n`

### Phase 1 — Identity & auth (the NINA spine)
4. Mongoose models + seed script with fictional citizens/services/tariffs/demo accounts
   → `feat(backend): add core mongoose models and fictional seed data`
5. Mock NINA registry adapter + lookup endpoint
   → `feat(backend): add mock nina registry adapter and citizen lookup`
6. OTP auth: request OTP → verify → JWT; mock SMS adapter; rate limiting
   → `feat(backend): implement nina otp authentication with jwt sessions`
7. Login UI: NINA entry → OTP screen → session context → protected routes
   → `feat(frontend): add nina otp login flow and protected routing`

### Phase 2 — Service catalog & smart request
8. Services catalog API (four modules, tariffs, required documents)
   → `feat(backend): add service catalog api for the four modules`
9. Catalog UI: module cards, service detail with transparent official tariff
   → `feat(frontend): add service catalog with transparent tariff display`
10. Request creation API + state machine + timeline + reference generator
    → `feat(backend): add request lifecycle with state machine and timeline`
11. MinIO storage adapter: private uploads, presigned-URL reads, MIME/size validation,
    server-generated object keys
    → `feat(backend): add minio storage adapter with presigned private access`
12. Request wizard UI, pre-filled from registry, with file upload
    → `feat(frontend): add smart request wizard with prefilled citizen data`

### Phase 3 — Payment
13. Mock payment adapter (Orange Money / Wave / card) + init/callback endpoints
    → `feat(backend): add mock mobile money and card payment adapters`
14. Payment UI: provider choice, simulated confirmation, receipt
    → `feat(frontend): add payment step with mobile money provider selection`

### Phase 4 — Back-office (staff auth + agent review)
15. Back-office auth + RBAC middleware for all four roles, module scoping, audit log
    → `feat(backend): add back-office authentication with role based access control`
16. Agent inbox API: list/filter (within module scope), assign, approve, reject, request info
    → `feat(backend): add agent review endpoints for request validation`
17. Role-gated `/admin` shell (staff login, layout, route guards by role) + agent back-office
    UI: queue, request detail, attachments (presigned URLs), decisions
    → `feat(frontend): add role-gated back-office with agent review workflow`

### Phase 5 — Delivery & notifications
18. PDF generation with QR code + SPÉCIMEN watermark, stored via the storage adapter;
    public verify endpoint
    → `feat(backend): generate qr signed demo documents with public verification`
19. Notification service (mock SMS/Email) on every transition
    → `feat(backend): notify citizens on request status transitions`
20. Citizen tracking UI: timeline, download document, delivery choice (digital/physical)
    → `feat(frontend): add request tracking timeline and document download`
21. Public QR verification page
    → `feat(frontend): add public qr code verification page`

### Phase 6 — Module admin, super-admin & polish
22. Module-admin APIs (manage own module's agents, services, tariffs) + super-admin APIs
    (manage admins, cross-module stats); statistics scoped by role
    → `feat(backend): add module-admin and super-admin management endpoints`
23. Module-admin dashboard (one module) + super-admin dashboard (global view, all modules)
    with charts, both under the role-gated `/admin` area
    → `feat(frontend): add module-admin and super-admin dashboards`
24. Accessibility & mobile-first pass, empty/loading/error states, French copy review
    → `polish: improve mobile responsiveness and accessibility across flows`
25. Backend tests (vitest + supertest) on auth, state machine, RBAC, upload validation
    → `test(backend): cover auth, request lifecycle and authorization rules`
26. Demo script + seeded walkthrough + README with setup instructions
    → `docs: add demo walkthrough and setup instructions`

**→ Validation gate: demo the web prototype. Do not start mobile until it is approved.**

### Phase 7 — Mobile (after web validation)
27. Expo app scaffold + shared API client
    → `feat(mobile): bootstrap expo react native app with shared api client`
28. NINA OTP login + service catalog
    → `feat(mobile): add nina login and service catalog screens`
29. Request wizard + payment + tracking
    → `feat(mobile): add request submission, payment and tracking screens`

### Later (not prototype)
- USSD gateway for non-smartphones (PDF risk mitigation: fracture numérique)
- Real biometric verification
- Rust backend port
- **Deploy MinIO on sovereign national infrastructure** (PDF §6). The software already
  matches the target; what changes is where it runs, plus TLS, replication/erasure coding,
  backups, and server-side encryption at rest. No application rewrite expected.
- **Split the back-office into its own frontend app** if/when production warrants it: staff
  shouldn't be served the citizen bundle, and it can then deploy behind a VPN on its own
  domain. Deferred for the prototype (one app, role-gated `/admin`); shared code is kept
  isolated so the split is extraction, not a rewrite.
- **Move the session token out of localStorage.** The prototype stores the JWT in
  localStorage, which any injected script can read. Production needs an httpOnly + Secure
  + SameSite cookie, a short access token, and refresh rotation.
- End-to-end encryption, national data-protection compliance

---

## 7. Conventions

- **Commits:** the user commits. Claude proposes the message, never runs `git commit`.
  Conventional Commits, imperative, scoped: `feat(backend):`, `feat(frontend):`, `fix:`,
  `chore:`, `docs:`, `test:`, `polish:`.
- **Env:** never commit `.env`. Keep `.env.example` current whenever a variable is added
  (placeholders only — never a real value). Two `.env` files: the root one feeds
  docker-compose (MinIO root + app credentials); `backend/.env` feeds the API and uses the
  scoped app credentials only.
- **Files:** all reads and writes go through the storage adapter (§2). Store `storageKey`,
  return presigned URLs.
- **Validation:** zod on every request body, server-side. Client validation is UX only.
- **Errors:** consistent shape `{ error: { code, message, details? } }`; French messages
  reach the user via i18n keys, not hardcoded backend strings.
- **Money:** store amounts as integers in XOF (no decimals). Never floats.
- **Dates:** store UTC ISO, display `fr-FR`.
- **Naming:** models singular PascalCase, collections plural, routes kebab-case plural
  (`/api/requests`), env vars SCREAMING_SNAKE.
- **API base:** `/api/v1`.
- **Components:** `.jsx`, one component per file, PascalCase filename.
- **Tailwind:** utility-first, extract a component when a class list repeats three times.
  Mobile-first breakpoints — the PDF makes mobile accessibility a core requirement.

## 8. Working agreements

- Prototype speed matters, but the request state machine, RBAC and the mock/real boundary
  are the parts worth getting right the first time — everything else can be rough.
- Prefer working vertical slices (one module end to end) over broad half-built layers.
- Ask before adding a dependency that is not in §3.
- Keep `Fiche de Projet eCivil.pdf` as the requirements reference; if a decision contradicts
  it, surface that rather than silently diverging.

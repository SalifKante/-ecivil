# eCivil — Plateforme Unifiée de la Citoyenneté Numérique

Prototype of a unified digital citizenship platform for Mali: a single virtual counter
(*guichet unique*) where citizens request, pay for, track and receive official documents,
keyed on the **NINA** national identification number.

> **⚠️ Prototype — not a production system.**
> All external integrations (NINA registry, SMS, payments) are mocked. All data is
> fictional. Generated documents are watermarked `SPÉCIMEN — SANS VALEUR LÉGALE` and have
> no legal value. Never load real personal data into this project.

**New here? Run the [demo walkthrough](docs/DEMO.md)** — a citizen requests a document, pays
for it, an agent instructs it, and the citizen collects a QR-signed specimen anyone can
verify. About 10 minutes.

## Modules

| Module | Services | State partner |
| --- | --- | --- |
| Identité & Voyage | Passport, biometric ID card | Ministère de la Sécurité |
| Événements de Vie | Birth & marriage certificates | Communes & Consulats |
| Mobilité Urbaine | Vehicle registration, carte grise | Direction des Transports |
| Titres Fonciers | Property deeds, cadastral verification | Urbanisme & Domaines |

## What works today

The whole citizen journey, end to end, plus the back-office that serves it.

- **Identity** — NINA + SMS OTP login, JWT sessions, rate limited per IP+NINA
- **Catalog** — four modules, transparent official tariffs
- **Requests** — smart form pre-filled from the registry, attachments, a server-side state
  machine with an append-only timeline
- **Payment** — Orange Money, Wave and card, all mocked; amounts read server-side, settlement
  atomic against replay
- **Back-office** — four-tier RBAC (`CITIZEN` / `AGENT` / `ADMIN` / `SUPER_ADMIN`) with module
  scoping, an agent inbox, and an audit log
- **Delivery** — watermarked SPÉCIMEN PDFs with a QR code, stored privately and served
  through short-lived signed URLs
- **Verification** — a public, unauthenticated endpoint and page for anyone holding a document
- **Notifications** — mocked SMS and email on every status transition
- **Dashboards** — statistics scoped by role, staff and tariff management

Not built yet: completing a request sent back for more information (see *Known limits* in the
[demo walkthrough](docs/DEMO.md)), and the mobile app.

## Roles

| Role | Scope | Does |
| --- | --- | --- |
| `CITIZEN` | self | Submits, pays for and tracks their own requests |
| `AGENT` | one module | Instructs requests: approve, reject, ask for more information |
| `ADMIN` | one module | Runs a module: its agents, services, tariffs, statistics |
| `SUPER_ADMIN` | global | Platform operators: all modules, manages admins, global stats |

Authorization is checked server-side on every non-public route. The UI hides screens; it does
not protect data.

## Stack

- **Frontend** — React + Vite, TailwindCSS, React Router, TanStack Query (UI in French)
- **Backend** — Node.js + Express, MongoDB + Mongoose, JWT
- **Storage** — MinIO, self-hosted S3-compatible object storage
- **Mobile** — React Native / Expo (phase 2)

## Requirements

- Node.js >= 20 (developed on 24)
- Docker Desktop — runs MongoDB and MinIO

## Getting started

```bash
# 1. Infrastructure credentials
cp .env.example .env       # set MINIO_ROOT_PASSWORD and MINIO_APP_SECRET_KEY
#    generate a value with:
#    node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"

# 2. Start MongoDB + MinIO (creates the private bucket and scoped app user)
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env       # set JWT_SECRET + the MinIO app credentials from step 1
npm install
npm run seed               # fictional citizens, services and demo accounts
npm run dev                # http://localhost:5000

# 4. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

Check everything is alive:

```bash
curl http://localhost:5000/health      # API + MongoDB
curl http://localhost:9000/minio/health/live   # MinIO
```

## Local services

| Service | URL | Notes |
| --- | --- | --- |
| Web app | http://localhost:5173 | French UI |
| API | http://localhost:5000 | `/health`, `/api/v1` |
| API docs | http://localhost:5000/api/docs | Swagger UI (spec at `/api/docs.json`) |
| MinIO console | http://localhost:9001 | Log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| MinIO S3 API | http://localhost:9000 | Bucket `ecivil-documents`, private |
| MongoDB | mongodb://localhost:27017 | Database `ecivil` |

## Logging in

**Citizens** use a NINA starting `9999` (e.g. `99990000000101`). The SMS gateway is mocked,
so the OTP is printed by the API and shown on the login screen.

**Staff** log in separately at `/admin/connexion` with an email and password — for example
`agent.etatcivil@ecivil.demo` / `Demo!Agent2`. Every demo account is listed in
`backend/seeds/data/users.js` and printed by `npm run seed`.

> The prototype holds one session at a time, so use a separate browser profile if you want a
> citizen and a staff session side by side.

## Tests

```bash
cd backend && npm test        # 160 tests, vitest + supertest
```

They run against a **real MongoDB and a real MinIO**, not stubs — `docker compose up -d`
first, or every suite fails at connect. A dedicated `ecivil_test` database is used, never
your development data.

## Layout

```
backend/    Express API — routes → controller → service → model
frontend/   React + Vite web app (French UI), citizens + role-gated /admin
mobile/     React Native app (phase 2)
docs/       Project documentation
```

## Documentation

- [`docs/DEMO.md`](docs/DEMO.md) — scripted end-to-end walkthrough, with accounts
- `CLAUDE.md` — architecture, conventions, and the full A-to-Z roadmap
- `Fiche de Projet eCivil.pdf` — original requirements
- Swagger UI at <http://localhost:5000/api/docs> once the API is running

## Security posture

The integrations are fake; the security is not. Passwords are scrypt-hashed, JWTs are
short-lived, sensitive routes are rate limited, and every route re-checks role and module
scope server-side. Uploads are validated and stored under server-generated keys in a private
bucket. Known prototype trade-offs — the token in `localStorage`, one session at a time, and
unaudited authorization failures — are listed in the [demo walkthrough](docs/DEMO.md).

# eCivil — Plateforme Unifiée de la Citoyenneté Numérique

Prototype of a unified digital citizenship platform for Mali: a single virtual counter
(*guichet unique*) where citizens request, pay for, track and receive official documents,
keyed on the **NINA** national identification number.

> **⚠️ Prototype — not a production system.**
> All external integrations (NINA registry, SMS, payments) are mocked. All data is
> fictional. Generated documents are watermarked `SPÉCIMEN — SANS VALEUR LÉGALE` and have
> no legal value. Never load real personal data into this project.

## Modules

| Module | Services | State partner |
| --- | --- | --- |
| Identité & Voyage | Passport, biometric ID card | Ministère de la Sécurité |
| Événements de Vie | Birth & marriage certificates | Communes & Consulats |
| Mobilité Urbaine | Vehicle registration, carte grise | Direction des Transports |
| Titres Fonciers | Property deeds, cadastral verification | Urbanisme & Domaines |

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

Seeded demo citizens use NINAs starting `9999` (e.g. `99990000000101`). The SMS gateway is
mocked, so in development the OTP is printed by the API and shown on the login screen.

## Layout

```
backend/    Express API — routes → controller → service → model
frontend/   React + Vite web app (French UI)
mobile/     React Native app (phase 2)
docs/       Project documentation
```

## Documentation

- `CLAUDE.md` — architecture, conventions, and the full A-to-Z roadmap
- `Fiche de Projet eCivil.pdf` — original requirements

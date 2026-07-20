# eCivil — demo walkthrough

A scripted run through the prototype, end to end: a citizen requests a document, pays for
it, an agent instructs the file, and the citizen collects a QR-signed specimen that anyone
can verify.

Allow about 10 minutes. Every step below has been run against a live stack.

> **Everything here is fictional.** Mocked registry, mocked SMS and email, mocked payments.
> The documents produced are watermarked specimens with no legal value.

---

## 0. Before you start

```bash
docker compose up -d          # MongoDB + MinIO
cd backend  && npm run dev    # http://localhost:5000
cd frontend && npm run dev    # http://localhost:5173
```

If this is a fresh database, seed it:

```bash
cd backend && npm run seed
```

`npm run seed` **wipes** citizens, services, users, requests and OTP challenges, then prints
every demo account. It refuses to run with `NODE_ENV=production`.

Check the stack is alive — both dependencies should read `up`:

```bash
curl http://localhost:5000/health
```

---

## 1. Accounts

### Citizens — NINA + SMS code

| NINA | Name | Note |
| --- | --- | --- |
| `99990000000101` | Aminata Traoré | Bamako |
| `99990000000104` | Ibrahim Coulibaly | diaspora, Paris |
| `99990000000106` | Oumar Cissé | diaspora, New York |

The SMS gateway is mocked, so **the code is shown on the login screen** and printed in the
API log. There is no real message.

### Back-office — email + password

Full list in `backend/seeds/data/users.js`, printed by `npm run seed`.

| Email | Password | Role |
| --- | --- | --- |
| `agent.etatcivil@ecivil.demo` | `Demo!Agent2` | AGENT — Événements de Vie |
| `admin.etatcivil@ecivil.demo` | `Demo!Admin2` | ADMIN — Événements de Vie |
| `superadmin@ecivil.demo` | `Demo!Super1` | SUPER_ADMIN — all modules |

---

## 2. The citizen journey

### 2.1 Log in — NINA + OTP

Open <http://localhost:5173> → **Se connecter**.

Enter `99990000000101`. The screen confirms the identity it found (first name, last name,
masked phone) and shows the 6-digit code. Enter it.

> The confirmation is deliberately minimal — an unauthenticated caller must not be able to
> harvest a full identity record by guessing NINA numbers.

### 2.2 Choose a service

**Services** → *Événements de Vie* → **Extrait d'acte de naissance** (1 000 FCFA).

Tariffs are shown before anything is committed; that transparency is one of the project's
stated goals.

### 2.3 Fill the request

The form is **pre-filled from the registry** — name, NINA, date of birth are already there.
Add a motif, choose a delivery mode, optionally attach a file (JPG/PNG/PDF, 5 MB max).

> Attachments go to MinIO under a server-generated key. The client filename is never used
> as the key, only stored for display.

Submit. You land on the payment step.

### 2.4 Pay

Choose **Orange Money**, **Wave** or **Carte bancaire**.

- Mobile money asks for the wallet number and simulates a USSD confirmation.
- Card simulates a redirect to the partner bank. **No card details are ever collected** —
  a prototype has no business rendering something that looks like a real card form.

Then pick the outcome:

- **Simuler un paiement réussi** → the request becomes `Payée` and you get a receipt.
- **Simuler un refus** → the payment fails, the request stays payable, and you can retry
  with another provider.

Try the refusal first — the retry path is worth seeing.

> The amount is read server-side from the request. A client-supplied amount is ignored, and
> a replayed confirmation is refused rather than charged twice.

### 2.5 Follow it

**Suivi** lists your requests. Open the new one: full timeline, and at the top the one thing
you actually have to do next.

Leave it here and switch to the back-office.

---

## 3. The back-office

Open <http://localhost:5173/admin/connexion> — ideally in a **separate browser profile or
private window**, since the prototype holds one session at a time and logging in as staff
replaces the citizen session.

### 3.1 Instruct the file — as an agent

Log in as `agent.etatcivil@ecivil.demo` / `Demo!Agent2`.

The inbox shows **only Événements de Vie**. That is not a UI filter: the API scopes every
query to the agent's module, and a request from another module returns 404 — an agent must
not learn that a file they cannot serve exists.

Open the request →

1. **Prendre en charge** — assigns it to you, status becomes *En cours d'instruction*.
2. Read the applicant data and open any attachment. Documents open through a short-lived
   signed link, and each open is recorded in the audit log.
3. Decide:
   - **Approuver**
   - **Demander un complément** — needs a real message; the citizen receives it
   - **Rejeter** — needs a reason; the citizen receives it

Approve it.

### 3.2 Issue the document

Still on the request: **Émettre le document**.

This renders the PDF, stores it privately, and moves the request to *Document émis*.

> Issuing is a separate act from approving on purpose. A decision must not fail because
> object storage is briefly unavailable; if issuing fails, the request stays approved and
> can be retried.

### 3.3 Try the guards

Worth demonstrating, because they are the point:

- Log in as `agent.identite@ecivil.demo` / `Demo!Agent1` and search the same reference —
  **nothing**. Different module.
- As an agent, try the management tabs — they are not shown, and the API returns 403.
- As `admin.etatcivil@ecivil.demo`, open **Personnel**: you can create agents, but only for
  your own module, and the ADMIN role is not offered.

---

## 4. Delivery and verification

### 4.1 The citizen collects

Back as the citizen (`99990000000101`) → **Suivi** → the request → **Télécharger le
document**.

The PDF carries:

- a diagonal **SPÉCIMEN — PROTOTYPE / SANS VALEUR LÉGALE** watermark across the page
- a red banner above the title
- a QR code
- a footer repeating that it has no legal value

### 4.2 Anyone verifies it

Scan the QR code, or open **Vérifier un document** and paste the token.

**Do this in a private window** — verification requires no session at all. A QR code is
scanned by whoever is handed the document, who has no reason to hold an eCivil account.

The result shows validity, reference, module and issue date — and only the holder's first
name plus last initial (*Aminata T.*). A scanned code must not become an
identity-lookup oracle.

Try a made-up token too: a clear "non reconnu", still carrying the prototype disclaimer.

---

## 5. Dashboards

Log in as `superadmin@ecivil.demo` / `Demo!Super1` → **Tableau de bord**.

Consolidated figures across all four modules: requests, backlog, issued documents, revenue
collected, and a 14-day chart.

Then log in as `admin.etatcivil@ecivil.demo` and compare — same screen, one module's
numbers. The scoping is applied in the query, so an out-of-scope request never reaches the
caller even as a number.

---

## 6. What is real and what is mocked

| Piece | Status |
| --- | --- |
| NINA registry | **MOCK** — a seeded collection of fictional citizens |
| SMS / email | **MOCK** — logged by the API, never sent |
| Payments | **MOCK** — no money moves, outcome chosen in the UI |
| Object storage | **REAL** — self-hosted MinIO, private bucket, signed URLs |
| Auth, RBAC, state machine, audit log | **REAL** — enforced server-side |
| Generated documents | Real PDFs, watermarked specimens, no legal value |

Every mock refuses to run with `NODE_ENV=production` rather than silently pretending to
work.

---

## 7. Known limits

Worth stating before anyone asks:

- **A file sent back for more information cannot be completed online.** Resubmitting would
  route an already-paid request back to payment, so the door is deliberately shut. Fixing
  it properly needs a resubmit path that preserves the settled payment.
- **One session at a time.** Logging in as staff replaces a citizen session; use a separate
  browser profile for the two halves of the demo.
- **The session token lives in `localStorage`**, readable by any injected script. Production
  needs an httpOnly cookie with refresh rotation.
- **Failed authorization attempts are not audited** — only successful reads and actions are.
- The inbox lists requests awaiting payment, which agents cannot act on yet; the filter
  chips narrow to what is actionable.

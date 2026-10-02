# 2D Flip Studio — Local Platform Setup

This V1 keeps the existing animation editor intact and adds a small local Express/PostgreSQL platform around it.

## 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 17 (PostgreSQL 15+ is also suitable)
- A local PostgreSQL role with permission to create/use the application database

## 2. Local environment

Copy `.env.example` to `.env.local` and replace every placeholder locally:

```text
DATABASE_URL=postgresql://postgres:URL_ENCODED_PASSWORD@localhost:5432/2dstudio
SESSION_SECRET=a-long-random-secret-at-least-32-characters
PORT=5175
APP_ORIGIN=http://127.0.0.1:5174
```

If the password contains `@`, `!`, `:` or other URL-significant characters, URL-encode it in `DATABASE_URL`. Change credentials only in `.env.local`; do not edit source code. `.env.local` and other secret environment files are ignored by Git. `.env.example` contains placeholders only.

Optional limits:

```text
GENERAL_RATE_LIMIT_PER_MINUTE=100
AUTH_RATE_LIMIT_PER_MINUTE=5
PROJECT_BODY_LIMIT=10mb
```

## 3. Database and migrations

Create the database once:

```sql
CREATE DATABASE "2dstudio";
```

Then run:

```bash
npm install
npm run db:migrate
```

Migrations are idempotent and recorded in `schema_migrations`.

## 4. Owner bootstrap

Public registration can only create `USER` accounts. To create or rotate the single local `OWNER`, set local environment values and run:

```text
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=a-strong-local-password
```

```bash
npm run owner:bootstrap
```

Never put an owner password in a tracked file. Remove the bootstrap password from the environment after use if desired; the database stores only a bcrypt hash.

## 5. Start backend and frontend

Start both processes:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:server
npm run dev:web
```

Frontend: `http://127.0.0.1:5174`  
API: `http://127.0.0.1:5175`

## 6. User workflow

1. Open the landing page and choose **Start Creating**.
2. Register with an email and a password of at least 10 characters.
3. In **My Projects**, choose **New Project**, a name and aspect ratio.
4. The existing Studio opens with the project loaded.
5. Meaningful editor changes are debounced and saved to PostgreSQL. `Saving…` changes to `Saved ✓` after the versioned update succeeds.
6. Return to **My Projects** to open, rename, duplicate or delete projects.

## 7. Persistence behavior

- `projects.project_data` JSONB stores the complete existing serializable Studio `Project` object.
- Playback time and `playing` state are not uploaded.
- Autosave waits for edits to settle and does not run on each playback frame.
- Every successful save increments `projects.version`.
- A stale version receives HTTP `409`; it cannot overwrite a newer save.
- Every project query is scoped by the authenticated server-side user ID.
- The existing local browser autosave remains a recovery aid; PostgreSQL is authoritative for authenticated projects.

## 8. Support settings

An OWNER can open `/owner/settings`. Public support UI is rendered only when `is_visible` is enabled. Payments are redirected to the configured PayPal URL; the application does not process payment credentials, webhooks or payment history. `current_amount` is updated manually.

## 9. Security notes

- Passwords use bcrypt with cost 12.
- Authentication uses an HTTP-only, SameSite=Lax session cookie; session data is stored in PostgreSQL.
- Registration cannot accept a role from the request body.
- Owner authorization and project ownership are enforced by the API.
- API and auth rate limits are centrally configurable.
- Oversized JSON requests receive HTTP 413.
- The provisional License, Privacy and Imprint pages require owner legal review before public release.

## 10. Verification

```bash
npm run build
npx tsx server/acceptance.ts
npx tsx server/rate-limit-acceptance.ts
```

The acceptance test creates temporary users/projects, checks CRUD, ownership isolation, owner authorization, relogin persistence, optimistic version conflicts, auth rate limiting and request-size protection, then removes its temporary records.


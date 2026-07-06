# 📍 FindMyArtisan

**A geolocation-based platform that connects communities in Ilaro, Ogun State with trusted local artisans — electricians, plumbers, carpenters, and more — within walking distance.**

FindMyArtisan lets residents discover nearby service providers on an interactive map, view proof-of-work photo catalogs, reveal contact details, and leave reviews after hiring. Artisans create a business profile, upload work photos, and go **live automatically** once they meet a lightweight quality bar — no gatekeeping bottleneck. Administrators monitor the platform and can suspend bad actors.

Built as a Final Year Thesis project for the Federal Polytechnic Ilaro community, engineered to production quality.

---

## 📑 Table of Contents

1. [Feature Overview](#-feature-overview)
2. [Tech Stack](#-tech-stack)
3. [System Architecture](#-system-architecture)
4. [Repository Structure](#-repository-structure)
5. [Core Concepts](#-core-concepts)
6. [Data Model](#-data-model)
7. [API Reference](#-api-reference)
8. [Getting Started](#-getting-started)
9. [Environment Variables](#-environment-variables)
10. [Available Scripts](#-available-scripts)
11. [User Journeys](#-user-journeys)
12. [Deployment](#-deployment)
13. [Troubleshooting](#-troubleshooting)
14. [Security Notes](#-security-notes)
15. [Roadmap](#-roadmap)
16. [License & Acknowledgements](#-license--acknowledgements)

---

## ✨ Feature Overview

### For customers (role: `user`)
- **Map-first discovery** — an interactive Leaflet + OpenStreetMap view centered on the user's GPS location, with a pin for each nearby artisan.
- **Proximity search** — powered by PostGIS; find artisans within a configurable radius (1–25 km) ranked by real geographic distance.
- **Filter & free-text search** — filter by service category or type what you need ("plumber", "wiring", "furniture"); searches are debounced and saved to history.
- **Provider profiles** — business details, star rating, review count, work-photo catalog, and address.
- **Reveal-to-contact** — clicking to reveal an artisan's phone number is recorded, unlocking the ability to review them later (prevents fake reviews from people who never hired).
- **Reviews with proof** — leave a 1–5★ rating, a comment, and an optional proof-of-work photo.
- **Personalized home** — a signed-in dashboard with quick actions and recent searches (distinct from the public marketing landing page).

### For artisans (role: `provider`)
- **Self-service onboarding** — choose "Work as an Artisan" at signup, then create a business profile (business name, category, description, phone, address, GPS coordinates, profile photo upload).
- **Custom categories** — don't see your trade? Type it and it's added on the fly.
- **Work catalog** — upload/delete work photos with instant confirmation feedback.
- **Auto-visibility** — go live in search automatically once your email is verified and you have at least **3** work photos. No admin approval step.
- **Live status panel** — a dashboard checklist shows exactly what's left before you're visible, plus a suspended-state banner if an admin hides you.

### For administrators (role: `admin`)
- **Overview dashboard** — live counts: total users, total providers, providers live in search, suspended providers, total reviews.
- **User directory** — every account with role badge, email-verification status, phone, and join date.
- **Provider moderation** — every business with owner, photo count, verification, and a **Live / Incomplete / Suspended** status, plus one-click **Suspend / Reinstate**.
- **Activity log** — a human-readable audit trail of platform events: signups, email verifications, new businesses, reviews submitted, and moderation actions.
- **Review moderation** — remove abusive reviews (auto-recalculates the provider's rating).

---

## 🧰 Tech Stack

| Layer        | Technology                                                                 |
|--------------|-----------------------------------------------------------------------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7                 |
| **Mapping**  | Leaflet + React-Leaflet, OpenStreetMap tiles                                |
| **Icons/UI** | lucide-react, custom glassmorphism design system                            |
| **HTTP**     | Axios (with JWT interceptor + 401 auto-logout)                              |
| **Backend**  | Node.js, Express, TypeScript (run via `tsx`)                                |
| **Database** | PostgreSQL + **PostGIS** (geospatial extension)                            |
| **Auth**     | JWT (jsonwebtoken) + bcryptjs password hashing + email OTP verification     |
| **Email**    | Nodemailer over Gmail SMTP (App Password)                                   |
| **Uploads**  | Multer (disk storage, served statically at `/uploads`)                     |

---

## 🏛 System Architecture

```
┌──────────────────────────────┐         HTTPS / JSON          ┌──────────────────────────────┐
│         Frontend (SPA)        │  ─────────────────────────▶  │        Backend (REST API)      │
│  React 19 + Vite + Tailwind   │      Axios + JWT Bearer       │      Express + TypeScript       │
│                               │  ◀─────────────────────────  │                               │
│  • Landing / Home             │                               │  Routers:                     │
│  • Discover (Leaflet map)     │                               │   /api/auth                   │
│  • Provider profile           │                               │   /api/providers              │
│  • Artisan dashboard          │                               │   /api/reviews                │
│  • Admin dashboard            │                               │   /api/admin                  │
└──────────────────────────────┘                               │   /api/categories, /health    │
                                                                └───────────────┬───────────────┘
        ▲                                                                        │
        │ static /uploads/* (work & review photos)                              │ SQL (pg Pool)
        │                                                                        ▼
        │                                                        ┌──────────────────────────────┐
        └────────────────────────────────────────────────────── │   PostgreSQL + PostGIS         │
                          Nodemailer → Gmail SMTP (OTP email)    │   geography(Point,4326) index  │
                                                                └──────────────────────────────┘
```

- The **frontend** is a single-page app; all data comes from the REST API via Axios. A request interceptor attaches the JWT from `localStorage`; a response interceptor logs the user out on `401`.
- The **backend** is a stateless Express API. A lazy `pg` connection pool talks to PostgreSQL. Database schema is applied automatically at boot by an idempotent migration runner.
- **PostGIS** stores each provider's location as `geography(Point, 4326)` and answers proximity queries with `ST_DWithin` / `ST_Distance`, backed by a GiST spatial index.
- **Uploaded images** are written to disk (`UPLOAD_DIR`) and served as static files under `/uploads`.

---

## 🗂 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts                # Express app: middleware, CORS, static uploads, routes, health, error handler, boot
│   │   ├── config/
│   │   │   └── database.ts         # Lazy pg Pool + query() helper
│   │   ├── db/
│   │   │   └── migrate.ts          # Idempotent schema migrations, admin bootstrap, optional sample seed
│   │   ├── middleware/
│   │   │   ├── auth.ts             # authenticate / requireAdmin / optionalAuth (JWT)
│   │   │   └── upload.ts           # Multer disk storage, file validation, publicUrl/deleteUploadedFile
│   │   ├── routes/
│   │   │   ├── auth.ts             # register, login, verify-otp, resend-otp, me
│   │   │   ├── providers.ts        # nearby search, CRUD, work images, contact clicks, history, categories
│   │   │   ├── reviews.ts          # submit review, list by provider
│   │   │   └── admin.ts            # stats, users, providers, suspend, delete review, activity logs
│   │   ├── services/
│   │   │   ├── email.ts            # Nodemailer OTP email (Gmail SMTP) with dev console fallback
│   │   │   └── activity.ts         # Central audit/activity logger
│   │   └── types/
│   │       └── index.ts            # Shared backend TypeScript types (AuthRequest, DTOs, etc.)
│   ├── uploads/                    # Uploaded images (gitignored; use a Volume in prod)
│   ├── .env / .env.example         # Backend configuration
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # React root
│   │   ├── App.tsx                 # Router, route guards (ProtectedRoute / PublicRoute / HomeRoute)
│   │   ├── index.css               # Tailwind + glassmorphism design tokens & animations
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Role-aware nav + account dropdown
│   │   │   ├── Footer.tsx          # Compact footer
│   │   │   ├── ProviderCard.tsx    # Provider result card
│   │   │   └── StarRating.tsx      # Reusable rating display/input
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx         # Auth context (login, register, verifyOtp, logout, session restore)
│   │   │   └── useGeolocation.ts   # Browser geolocation wrapper
│   │   ├── pages/
│   │   │   ├── Landing.tsx         # Public marketing page
│   │   │   ├── Home.tsx            # Signed-in dashboard home
│   │   │   ├── Login.tsx / Signup.tsx / VerifyEmail.tsx
│   │   │   ├── Dashboard.tsx       # "Find Services" — map + list discovery
│   │   │   ├── ProviderProfile.tsx # Public artisan profile + reviews
│   │   │   ├── ProviderRegister.tsx# Create a business profile
│   │   │   ├── ArtisanDashboard.tsx# "My Business" — catalog, visibility, reviews
│   │   │   ├── AdminDashboard.tsx  # Admin: overview, users, providers, logs
│   │   │   └── NotFound.tsx
│   │   ├── services/
│   │   │   └── api.ts              # Axios instance + typed API modules (authApi, providersApi, reviewsApi, adminApi)
│   │   └── types/
│   │       └── index.ts            # Shared frontend types
│   ├── .env                        # Frontend configuration (VITE_*)
│   └── package.json
│
```

---

## 🧠 Core Concepts

### 1. Roles
Every account has one of three roles, chosen at signup (`user` or `provider`) or provisioned by migration (`admin`):

- **`user`** — a customer who searches for and hires artisans.
- **`provider`** — an artisan with a business profile. A `user` is automatically upgraded to `provider` the moment they create a business profile.
- **`admin`** — platform operator, created/ensured on every boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.

### 2. Auto-Visibility Model
This is the platform's defining product decision. An artisan is **visible in search** when **all** of the following are true:

```
NOT suspended  AND  email verified  AND  work_images >= 3
```

There is **no admin approval step**. Artisans go live on their own once they've proven they're real (verified email) and shown their work (≥3 photos). Admins act by exception — they can **suspend** a provider to hide them (`is_suspended = true`), and **reinstate** them later. The rule lives in a single SQL clause (`VISIBILITY_CLAUSE`) in `backend/src/routes/providers.ts`.

### 3. Email Verification (OTP)
Registration never returns a session token. Instead, a 6-digit one-time code (10-minute TTL) is emailed via Gmail SMTP. The user submits it to `/api/auth/verify-otp` to activate their account and receive a JWT. If SMTP isn't configured (or fails), the code is printed to the server console so local development still works. Registering or logging in with an existing-but-unverified account transparently re-issues a fresh code.

### 4. Geospatial Proximity Search
Each provider's location is a PostGIS `geography(Point, 4326)`. The `/api/providers/nearby` endpoint uses `ST_DWithin` for radius filtering and `ST_Distance` for accurate distance, ordered nearest-first, with a GiST index (`idx_providers_location`) for speed. Radius is capped by `MAX_SEARCH_RADIUS`.

### 5. Reveal-to-Review Gating
A user can only review artisans they've actually contacted. Revealing a phone number records a row in `contact_clicks`; the review endpoint rejects submissions from users with no matching contact click. One review per user per provider (enforced by a unique constraint), and every new/removed review recalculates the provider's `average_rating` and `review_count`.

### 6. Image Uploads
Multer handles multipart uploads (JPEG/PNG/WebP/GIF, ≤5 MB). Files are stored on disk under `UPLOAD_DIR` (default `backend/uploads`) and served at `/uploads/<filename>`. Profile photos are attached at provider creation; work-catalog photos are uploaded (up to 6 per request) from the artisan dashboard.

### 7. Activity Logging
A central `logActivity()` helper records notable events into `admin_logs` — `user_registered`, `email_verified`, `provider_created`, `review_submitted`, `suspend_provider`, `unsuspend_provider`, `delete_review` — surfaced as readable sentences in the admin Activity Logs tab. Logging is best-effort and never blocks the main request.

---

## 🗃 Data Model

PostgreSQL with the `postgis` and `uuid-ossp` extensions. All primary keys are UUIDs.

| Table               | Purpose                                | Key columns                                                                                          |
|---------------------|----------------------------------------|------------------------------------------------------------------------------------------------------|
| `users`             | Accounts                               | `email` (unique), `password_hash`, `full_name`, `role`, `phone`, `email_verified`, `otp_code`, `otp_expires_at` |
| `service_categories`| Trades / service types                 | `name` (unique), `slug` (unique), `icon`, `description`                                              |
| `providers`         | Artisan businesses                     | `user_id` → users, `business_name`, `category_id`, `description`, `phone`, `address`, `location geography(Point,4326)`, `profile_image`, `is_verified`, **`is_suspended`**, `average_rating`, `review_count` |
| `work_images`       | Artisan work-photo catalog             | `provider_id` → providers, `image_url`, `caption`                                                    |
| `reviews`           | Customer reviews                       | `provider_id`, `user_id`, `rating` (1–5), `comment`, `image_url`; unique `(provider_id, user_id)`     |
| `contact_clicks`    | Phone reveals (enables reviews)        | `user_id`, `provider_id`; unique `(user_id, provider_id)`                                            |
| `search_history`    | Per-user recent searches               | `user_id`, `category_slug`, `search_term`, `latitude`, `longitude`                                  |
| `admin_logs`        | Activity / audit trail                 | `admin_id` (actor, nullable), `action`, `target_type`, `target_id`, `metadata` (JSONB)              |

**Relationships:** a `user` has at most one `provider` (1:1 via `user_id`); a `provider` has many `work_images` and `reviews`; a `review` links a `user` and a `provider`. Deletes cascade from users/providers to their dependent rows.

**Migrations** (`backend/src/db/migrate.ts`) run automatically on every server start. They are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), ensure the admin account, seed the 10 default service categories, and — only when `SEED_SAMPLE_DATA=true` — insert 10 demo artisans around Ilaro with sample work images.

---

## 🔌 API Reference

Base URL: `http://localhost:5001/api` (configurable). Auth via `Authorization: Bearer <JWT>`.
All responses share the envelope: `{ success: boolean, message?: string, data?: any, pagination?: {...} }`.

### Auth — `/api/auth`
| Method | Path           | Auth | Body                                              | Description |
|--------|----------------|------|---------------------------------------------------|-------------|
| POST   | `/register`    | —    | `email, password, fullName, phone?, role?`        | Create account; emails an OTP. Returns `needsVerification`, no token. |
| POST   | `/login`       | —    | `email, password`                                 | Log in. Unverified accounts get a fresh OTP + `403 needsVerification`. |
| POST   | `/verify-otp`  | —    | `email, otp`                                       | Verify email, activate account, return JWT + user. |
| POST   | `/resend-otp`  | —    | `email`                                            | Re-send a verification code (privacy-preserving response). |
| GET    | `/me`          | ✅   | —                                                 | Current user's profile. |

### Providers — `/api/providers`
| Method | Path                        | Auth      | Description |
|--------|-----------------------------|-----------|-------------|
| GET    | `/nearby`                   | optional  | Proximity search. Query: `latitude, longitude, radius?, category?, q?, page?, limit?`. |
| GET    | `/me`                       | ✅        | The logged-in artisan's profile + catalog + reviews + visibility status. |
| POST   | `/me/images`                | ✅        | Upload up to 6 work images (multipart field `images`). |
| DELETE | `/me/images/:imageId`       | ✅        | Delete a work image. |
| POST   | `/:id/contact-click`        | ✅        | Record a phone reveal; returns the provider's phone. |
| GET    | `/contacted/list`           | ✅        | Artisans the user has contacted (to prompt reviews). |
| GET    | `/searches/recent`          | ✅        | The user's recent searches. |
| GET    | `/:id`                      | optional  | Public provider profile + reviews + work images + viewer state. |
| POST   | `/`                         | ✅        | Create a provider profile (multipart; optional `profileImage` file). Upgrades role to `provider`. |
| GET    | `/`                         | —         | List providers (reference). |
| GET    | `/api/categories`           | —         | List service categories. |

### Reviews — `/api/reviews`
| Method | Path                    | Auth | Description |
|--------|-------------------------|------|-------------|
| POST   | `/`                     | ✅   | Submit a review (multipart: `providerId, rating, comment, image?`). Requires a prior contact click. |
| GET    | `/provider/:providerId` | —    | Paginated reviews + rating distribution for a provider. |

### Admin — `/api/admin` *(all require admin role)*
| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/stats`                      | Dashboard counts (users, providers, live, suspended, reviews). |
| GET    | `/users`                      | All users with role, verification, and whether they own a business. |
| GET    | `/providers`                  | All providers with computed Live/Incomplete/Suspended status. |
| PATCH  | `/providers/:id/suspend`      | Suspend / reinstate a provider (`{ suspended: boolean }`). |
| DELETE | `/reviews/:id`                | Delete a review and recalculate the provider rating. |
| GET    | `/logs`                       | Activity/audit log (most recent first). |

### System
| Method | Path          | Description |
|--------|---------------|-------------|
| GET    | `/api/health` | Liveness + a `build` stamp to confirm which code version is running. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 14+** with the **PostGIS** extension available
- A **Gmail account + App Password** (optional — for real OTP emails; without it, codes print to the console)

### 1. Set up the database
Create a database and enable PostGIS (the migration also runs `CREATE EXTENSION IF NOT EXISTS postgis`, but the extension must be installed on the server):

```bash
createdb findmyartisan
psql findmyartisan -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Configure & run the backend
```bash
cd backend
cp .env.example .env          # then edit .env (see Environment Variables below)
npm install
npm run dev                   # applies migrations, then starts on http://localhost:5001
```
On first boot you'll see the schema migrate, the admin account get ensured, and the API come up. To load demo artisans, set `SEED_SAMPLE_DATA=true` in `.env` and restart.

### 3. Configure & run the frontend
```bash
cd frontend
# create .env with at least: VITE_API_URL=http://localhost:5001/api
npm install
npm run dev                   # Vite dev server, typically http://localhost:5173
```

### 4. Log in
- **Admin:** the email/password from your backend `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- **New users/artisans:** sign up, then enter the OTP (from your email, or from the backend console if SMTP isn't set).

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable                | Required | Example / Default                     | Description |
|-------------------------|----------|---------------------------------------|-------------|
| `PORT`                  | no       | `5001`                                | API port. |
| `NODE_ENV`              | no       | `development`                         | `production` tightens CORS and disables dev fallbacks. |
| `DATABASE_URL`          | **yes**  | `postgres://user:pass@host:5432/db`   | PostgreSQL connection string. |
| `ADMIN_EMAIL`           | yes      | `admin@findmyartisan.com`             | Admin account (created/updated on boot). |
| `ADMIN_PASSWORD`        | yes      | `admin123`                            | Admin password (change in production!). |
| `ADMIN_NAME`            | no       | `System Administrator`                | Admin display name. |
| `SEED_SAMPLE_DATA`      | no       | `false`                               | `true` seeds 10 demo artisans around Ilaro. |
| `JWT_SECRET`            | **yes**  | `a-long-random-string`                | Secret for signing JWTs. |
| `JWT_EXPIRES_IN`        | no       | `24h`                                 | Token lifetime. |
| `CLIENT_URL`            | no       | `http://localhost:5173`               | Allowed CORS origin (your frontend URL). In dev, any localhost port is also allowed. |
| `DEFAULT_SEARCH_RADIUS` | no       | `5`                                   | Default search radius (km). |
| `MAX_SEARCH_RADIUS`     | no       | `10`                                  | Maximum allowed radius (km). |
| `GMAIL_USER`            | no*      | `you@gmail.com`                       | Gmail address to send OTPs from. |
| `GMAIL_APP_PASSWORD`    | no*      | 16-char App Password                  | Google App Password (not your login password). |
| `UPLOAD_DIR`            | no       | `./uploads`                           | Where uploaded images are stored. |

\* Without Gmail credentials, OTP codes are logged to the server console (fine for development).

### Frontend (`frontend/.env`)
| Variable             | Required | Example                        | Description |
|----------------------|----------|--------------------------------|-------------|
| `VITE_API_URL`       | yes      | `http://localhost:5001/api`    | Backend API base URL. |
| `VITE_APP_NAME`      | no       | `FindMyArtisan`                | App display name. |
| `VITE_DEFAULT_RADIUS`| no       | `5`                            | Default UI search radius (km). |
| `VITE_MAX_RADIUS`    | no       | `10`                           | Max UI search radius (km). |

---

## 📜 Available Scripts

### Backend
| Command           | What it does |
|-------------------|--------------|
| `npm run dev`     | Frees port 5001, then runs the API with `tsx watch` (hot reload). Migrations run on start. |
| `npm run build`   | Compiles TypeScript to `dist/`. |
| `npm start`       | Frees port 5001, then runs the compiled `dist/index.js`. |
| `npm run migrate` | Runs migrations standalone. |

> The `dev`/`start` scripts automatically kill any stale process on port 5001 (`lsof -ti :5001 | xargs kill -9`) before booting — this prevents the classic `EADDRINUSE` zombie that keeps an old build alive.

### Frontend
| Command           | What it does |
|-------------------|--------------|
| `npm run dev`     | Vite dev server with HMR. |
| `npm run build`   | Type-checks and builds the production bundle to `dist/`. |
| `npm run preview` | Serves the production build locally. |
| `npm run lint`    | Runs oxlint. |

---

## 🧭 User Journeys

**Customer:** Sign up as "Find Artisans" → verify email (OTP) → land on your Home dashboard → open **Find Services** → allow location → browse the map/list → open a profile → reveal the number (Call/WhatsApp) → after hiring, come back and leave a review with a photo.

**Artisan:** Sign up as "Work as an Artisan" (phone required) → verify email → create your business profile (category or custom trade, description, address, GPS, profile photo) → upload **≥3 work photos** → you're **live in search automatically**. Your dashboard shows a visibility checklist and, if applicable, a suspension notice.

**Admin:** Log in with admin credentials → **Overview** for platform health → **Users** to inspect accounts → **Manage Providers** to suspend/reinstate → **Activity Logs** to audit what's happening → moderate reviews as needed.

---

## ☁️ Deployment

The backend is Railway-friendly (the `.env.example` documents this):

- **Database:** provision PostgreSQL with PostGIS; set `DATABASE_URL`. Migrations run automatically on deploy.
- **Uploads:** disk storage is ephemeral on most PaaS. Create a **persistent Volume**, mount it (e.g. `/data/uploads`), and set `UPLOAD_DIR` to that path so work/review photos survive redeploys.
- **CORS:** set `CLIENT_URL` to your deployed frontend origin.
- **Secrets:** set a strong `JWT_SECRET`, a real `ADMIN_PASSWORD`, and Gmail credentials for OTP email.
- **Build/run:** `npm run build` then `npm start`.

The frontend builds to static assets (`npm run build`) deployable to any static host (Vercel, Netlify, Railway static, etc.). Set `VITE_API_URL` to the deployed API before building.

---

## 🩺 Troubleshooting

| Symptom | Cause & Fix |
|---------|-------------|
| **`EADDRINUSE: :::5001`** on start | A stale process holds the port. The `dev`/`start` scripts now auto-kill it; if you started the server another way, run `lsof -ti :5001 \| xargs kill -9` then restart. Confirm the live build with `curl http://localhost:5001/api/health` (check the `build` field). |
| **Admin pages 404 / show old data** | You're hitting an old backend build (stale process). Kill port 5001 and restart; verify `/api/health` reports the current `build`. |
| **OTP email never arrives** | `GMAIL_USER`/`GMAIL_APP_PASSWORD` unset or wrong. Use a 16-char **App Password** (not your Gmail login). If unset, the code prints to the backend console (look for `[Email:DEV]` / `[Email:FALLBACK]`). |
| **CORS error in the browser** | Add your frontend origin to `CLIENT_URL`. In development, any `localhost`/`127.0.0.1` port is allowed automatically. |
| **PostGIS / geography errors** | Ensure the PostGIS extension is installed on the database server; the app enables it but can't install the binary. |
| **No artisans on the map** | An artisan is only visible when *not suspended + email verified + ≥3 work photos* — and within the search radius. Widen the radius or check the provider's status in the admin panel. |
| **Blank page after data loads** | Historically caused by calling `.toFixed()` on a Postgres `DECIMAL` (returned as a string) — always coerce with `Number(...)`. Guard nullable fields before formatting. |

---

## 🔐 Security Notes

- Passwords are hashed with **bcrypt** (cost 12); plaintext is never stored.
- Sessions use **JWTs**; the frontend attaches them per-request, logs out automatically on `401`, and auto-logs-out after **15 minutes of inactivity** (idle timeout).
- **Email verification** is required before a session is issued.
- Admin routes are protected by both `authenticate` and `requireAdmin` middleware.
- File uploads are **type- and size-validated** (image MIME types, ≤5 MB).
- Reviews are **gated by prior contact** and de-duplicated per user/provider.
- For production: rotate `JWT_SECRET`, set a strong `ADMIN_PASSWORD`, run behind HTTPS, and scope `CLIENT_URL` to real origins.

---

## 🛣 Roadmap

Ideas for future iterations:
- In-app messaging between customers and artisans
- Push/email notifications for new reviews and contact requests
- Artisan availability / booking calendar
- Category-level analytics for admins
- Progressive Web App (installable, offline map caching)
- Cloud object storage (S3/Cloudinary) for images instead of local disk

---

## 📄 License & Acknowledgements

Built for the **Federal Polytechnic Ilaro** community as a Final Year Thesis project. See `docs/Yemisi_Thesis_Final.docx` for the accompanying write-up.

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Rendered with [Leaflet](https://leafletjs.com/). Icons by [Lucide](https://lucide.dev/).

---

<p align="center"><em>FindMyArtisan — connecting Ilaro communities with trusted local artisans.</em></p>

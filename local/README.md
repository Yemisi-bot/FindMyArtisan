# Running FindMyArtisan on your own machine

This folder runs the whole app — database, API and website — on your computer.
It does not touch the live site or the hosted database, and you do not need a
Neon, Cloudinary or Render account.

## What you need

**Docker Desktop**, and nothing else. No Node, no PostgreSQL, no setup.

- macOS / Windows / Linux: https://www.docker.com/products/docker-desktop/

Install it, open it, and wait until it says **Running**.

## Start it

**Windows** — double-click **`start_local.bat`**, or from PowerShell:

```powershell
cd local
.\start_local.bat
```

**macOS / Linux** — from a terminal:

```bash
cd local
./start_local.sh
```

Both do exactly the same thing. Use the `.bat` on Windows: `start_local.sh` is
a bash script and will not run in PowerShell or Command Prompt (it does work
inside WSL or Git Bash, if you prefer those).

The first run takes a few minutes — it downloads PostgreSQL and compiles both
apps. After that it starts in seconds. When it's ready the script prints the
address and opens your browser at:

**http://localhost:3000**

## Signing in

The database is seeded with ten demo artisans around Ilaro, each with photos
and reviews, so there is something to search for immediately.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@findmyartisan.com` | `admin123` |
| Artisan | `brightspark@findmyartisan.com` | `admin123` |
| Artisan | `aquafix@findmyartisan.com` | `admin123` |

Every seeded account uses `admin123`, including the ten demo artisans. (The
comment in `backend/src/db/migrate.ts` says `artisan123`, but the hash actually
stored there is the `admin123` one — the comment is wrong, not the data.)

You can also sign up a new account — any email address works, since email
verification is off.

**These passwords are for local use only.** They exist only in the database on
your machine.

## If you see "no artisans found"

The demo artisans are in **Ilaro, Ogun State**, and search only looks within
25 km. If you are somewhere else, or you declined the location prompt, the app
will correctly find nothing.

On **Find Services**, enter the coordinates by hand:

- Latitude `6.8886`
- Longitude `3.0225`

Then press Search, and all ten appear.

## Everyday commands

On Windows, swap `./start_local.sh` for `start_local.bat` throughout:

```bash
./start_local.sh            # start (and build if anything changed)
./start_local.sh --stop     # stop, keeping your data
./start_local.sh --logs     # watch what the app is doing
./start_local.sh --fresh    # wipe the database and start over
```

Your data lives in Docker volumes, so stopping and starting keeps accounts,
artisans and uploaded photos. `--fresh` deletes them and reseeds the demo data.

## How it fits together

```
  browser :3000  ──▶  web (nginx)  ──┬──▶  /api      ──▶  api (Express :5001)
                                     └──▶  /uploads  ──▶  api                │
                                                                             ▼
                                                              db (PostgreSQL + PostGIS)
```

Three containers:

| Container | What it is |
|---|---|
| `db` | PostgreSQL 16 with **PostGIS**, which the distance search depends on. The image is multi-arch, so it runs natively on Intel, AMD and Apple Silicon |
| `api` | The Express API. Creates its own schema and demo data on first start |
| `web` | The compiled React site, served by nginx |

Two details worth knowing, because they differ from the deployed setup:

- **No CORS.** nginx serves the site and forwards `/api` to the API container,
  so the browser only ever talks to one address. The frontend uses the relative
  `/api` path rather than a hard-coded host.
- **Uploads go to disk, not Cloudinary.** Photos you upload are stored in a
  Docker volume. To use a real Cloudinary account instead, create a `.env` file
  in this folder with `CLOUDINARY_URL=cloudinary://key:secret@cloud_name` and
  restart.

## When something goes wrong

**"Docker is not running"** — open Docker Desktop and wait for *Running*.

**"Port 3000 is already in use"** — another program has it. Find it with
`lsof -nP -iTCP:3000 -sTCP:LISTEN`, or stop the other program.

**The site loads but nothing happens** — check the API:

```bash
curl http://localhost:3000/api/health
./start_local.sh --logs
```

**Windows: `'\r': command not found`** — you ran `start_local.sh` instead of
`start_local.bat`, and Git converted the file to Windows line endings. Use the
`.bat`. (A `.gitattributes` in the repo prevents this on fresh clones.)

**Windows: the window closes instantly** — run it from PowerShell rather than
double-clicking, so you can read the error.

**Anything else** — `./start_local.sh --fresh` (or `start_local.bat --fresh`)
rebuilds from a clean database and fixes most problems.

## Making changes to the code

The containers run a compiled copy of the code, so editing a file does not
update the running app. After changing anything in `backend/` or `frontend/`:

```bash
./start_local.sh    # rebuilds whatever changed, then restarts
```

For active development with instant reload, run the apps directly instead —
see the main project README for `npm run dev`.

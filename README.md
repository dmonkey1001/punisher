# Punisher 🏋️

A self-hosted home-workout app for two people (Derek & Tai). It builds and
tracks **hypertrophy-focused** strength workouts around your actual equipment,
records sets/reps/effort (RIR), and tracks bodyweight + measurements.

Mobile-first (designed to use from a phone at the rack), runs as a single
Docker container on your home network. See [`docs/DESIGN.md`](docs/DESIGN.md)
for the full design, including the adaptive training engine planned for later
phases.

> **Status — Phase 1 (foundations & logging).** Profiles, equipment/plate
> inventory, manual workout logging with live plate-math hints, conditioning,
> history, and body tracking. The automatic workout *generation* and
> readiness-driven autoregulation land in Phase 2/3.

## Features (Phase 1)

- **Two profiles** — tap Derek or Tai to start (no passwords; trusted LAN).
- **Equipment-aware plate math** — your barbell + plate-loaded cables share one
  plate inventory; the app only ever suggests loads you can actually build and
  tells you which plates to load (per side for the bar, on the carriage for
  cables, with a configurable cable pulley ratio).
- **Fast logging** — add exercises from a seeded library, log weight/reps/RIR
  per set, sets prefill from your last performance.
- **Conditioning** — separate conditioning sessions/finishers.
- **History** — past workouts with set counts and volume.
- **Body tracking** — bodyweight trend + circumference measurements.

## Tech

SvelteKit + TypeScript · Tailwind CSS · Drizzle ORM + SQLite (`better-sqlite3`)
· adapter-node · Vitest. The training/plate-math logic is isolated, pure
TypeScript in `src/lib/server/training/` and unit-tested.

The database **migrates and seeds itself on first startup** — no manual setup.

## Local development

Requires Node.js 20+.

```sh
npm install
npm run dev          # http://localhost:5173
```

Useful scripts:

```sh
npm run check        # type-check (svelte-check)
npm test             # run unit tests (plate-math, etc.)
npm run db:studio    # browse the SQLite DB (Drizzle Studio)
```

The dev database is a local `local.db` file (gitignored), created and seeded
automatically on first request.

## Deploying with Docker / Portainer

The app ships as a single container. The SQLite database lives on a named
volume (`punisher-data` → `/data`) so your data survives updates.

### Option A — Portainer stack from this Git repo

1. In Portainer: **Stacks → Add stack → Repository**.
2. Point it at this repository; set the compose path to `docker-compose.yml`.
3. Deploy. Portainer builds the image and starts the container.
4. Open `http://<server-ip>:8585`.

### Option B — build the image, then deploy

```sh
docker build -t punisher:latest .
```

Then in Portainer create a stack and paste the contents of
`docker-compose.yml` (comment out `build: .` and keep `image: punisher:latest`
since the image already exists locally).

### Option C — plain Docker

```sh
docker build -t punisher:latest .
docker run -d --name punisher -p 8585:3000 -v punisher-data:/data --restart unless-stopped punisher:latest
```

### Configuration

| Env var        | Default              | Notes                                        |
| -------------- | -------------------- | -------------------------------------------- |
| `DATABASE_URL` | `/data/punisher.db`  | SQLite file path (on the volume).            |
| `PORT`         | `3000`               | In-container port (host maps `8585:3000`).   |

The app disables SvelteKit's cross-origin form check (`csrf.checkOrigin`) so any
device on your LAN can submit forms without per-IP origin config. This is safe
for a trusted home network only — don't expose it to the public internet.

## Backups

The entire database is one file on the `punisher-data` volume. To back up, copy
`/data/punisher.db` out of the volume, e.g.:

```sh
docker cp punisher:/data/punisher.db ./punisher-backup-$(date +%F).db
```

## First run

On first launch the app seeds:

- Profiles **Derek** and **Tai**
- The home-gym equipment (bars, the shared plate inventory, dumbbells)
- A default hypertrophy exercise library + conditioning movements

Adjust bar weights, plates, and the cable pulley ratio under **Gear** to match
reality — those values drive every load the app suggests.

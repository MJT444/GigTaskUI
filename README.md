# GigTask — Assignment 2 front end (CS6.302, Project P5)

GigTask is a freelance micro-jobs marketplace. This repository carries forward the
[GitTask Assignment 1 database repository](https://github.com/MohitSharma25/GitTask) at commit `5d38fee`
(history kept) and adds a web front end and a small API so every Part A workflow can be done in a browser:
fund a gig, follow a client's escrow trail, see freelancer revenue analytics, find workers near a job site on a
live map, and explore reviews and portfolios.

| | |
|---|---|
| **Team number** | `TODO` |
| **GitHub repository** | https://github.com/MJT444/GitTaskUI |
| **Inherited repository** | https://github.com/MohitSharma25/GitTask (commit `5d38fee`) |
| **Final commit hash** | `TODO — after the last push` |
| **Demo video (≤ 5 min)** | `TODO — link` |

## 1. Structure

```text
db/                  Inherited database code, unchanged
  sql/               01–06 inherited · 07_ui_support.sql (new, additive: one table)
  mongo/             01–03 inherited
  data_generation/   inherited seeders
  performance/ docs/ inherited evidence and ERD
  README.md          the original team's README, unchanged
api/                 Express API — thin layer, the databases do the work
  src/routes/        clients, freelancers, contracts, gigs, analytics, workers, reviews
  src/mongo/         $geoNear and $facet pipelines (from db/mongo/02, 03)
  test/              unit tests (no database needed)
  integration-tests/ end-to-end tests against the running API
web/                 React + Vite front end
  src/pages/         one file per screen
  src/components/    shared UI kit; mongo/ = map + portfolio
  src/styles/        design tokens and components
docs/                requirements, wireframes, design system, API, handover note, MongoDB guide
scripts/             setup.ps1 / setup_db.sh (one-time DB setup), start.ps1 (Windows start)
docker-compose.yml   PostgreSQL 16 + MongoDB 8
```

Planning and design documents:
[requirements and screens](docs/requirements_and_screens.md) ·
[wireframes](docs/design/wireframes.md) ·
[design system](docs/design/design_system.md) ·
[API endpoints](docs/api_endpoints.md) ·
[handover note](docs/handover_note.md) ·
[MongoDB front-end guide](docs/mongodb_frontend_guide.md)

## 2. Run it

**Prerequisites:** Docker Desktop (running), Python 3.9+, Node.js 20.12+ (22 LTS recommended).
PostgreSQL and MongoDB run in Docker on host ports **5433** and **27018**, chosen so they never clash with
databases already installed on the computer. Database user `postgres`, password `gigtask`, database `gigtask`
(the inherited seeders' defaults).

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1     # once (add -Reset to start over)
powershell -ExecutionPolicy Bypass -File scripts\start.ps1     # every time; opens http://localhost:5173
```

### macOS / Linux

```bash
./scripts/setup_db.sh                                      # once (--reset to start over); use a Python venv
cd api && cp .env.example .env && npm install && npm start  # http://localhost:4000
cd web && npm install && npm run dev                        # http://localhost:5173 (second terminal)
```

Open **http://localhost:5173** and choose a client under **Acting as client** (top right).

**What setup does, in order:** `db/sql/01`–`05` → `db/sql/07_ui_support.sql` → `postgres_seeder.py` →
the inherited `refresh_freelancer_lifetime_stats()` (the view is empty until then) → Mongo `01` → `mongo_seeder.py`
(it reads freelancer ids from PostgreSQL, so it must run after the PostgreSQL seed).

### Tests

```bash
cd api && npm test                   # unit: pipelines, error mapping, validation, geometry
cd api && npm run test:integration   # end-to-end; needs the API running and seeded databases
cd web && npm test                   # Fund-gig form: success, both DB failures, validation
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| Red “API” dot | API not running: `cd api && npm start` |
| Red “MongoDB” dot; map and reviews fail, other screens work | `docker compose up -d` |
| Map: “No available workers within 5 km” | Seeded pings expire 2 h after seeding (TTL). Press **Add fresh pings** or turn on **Auto-add**. |
| Map tiles grey | Tiles come from openstreetmap.org — needs internet |
| Setup: ports 5433/27018 used by other containers | `docker stop <container names it prints>` |
| Setup: “already has data” / “tables exist” | `scripts\setup.ps1 -Reset` |

## 3. Users and screens

Personas are described in [requirements and screens](docs/requirements_and_screens.md): **client**, **freelancer**,
**demo operator**.

| Screen | Workflow | What it shows | Database work |
|---|---|---|---|
| **Explore** | — | Clients, freelancers, contracts: search, filters, pagination, detail pages (portfolio on freelancer pages) | `LIMIT/OFFSET` on indexed columns; never the whole table |
| **Fund gig** | 1 | Form → escrow before/after, the new contract, the new audit row; friendly failures with a fix | `CALL fund_gig` in `REPEATABLE READ`; `trg_wallet_audit`; `idx_active_gig` |
| **Contract page** | 1 | FUNDED → IN_PROGRESS → COMPLETED | `idx_active_gig` on start; forward-only checked in the API |
| **Escrow** | Audit | Audit rows, date filter, running balance, rows-matching count, top-up | window `SUM() OVER` from the current balance back, then filter |
| **Analytics** | 2 + MV | 7-day moving-average chart, DENSE_RANK ranking (the Part A query, period selectable), lifetime stats + last refresh + refresh | `db/sql/06` query; inherited `refresh_freelancer_lifetime_stats()` |
| **Workers map** | 3 | Job site + 5 km circle, nearest-first list, 5 s polling, new pings highlighted | `$geoNear` on the `2dsphere` index |
| **Reviews** | 4 | Rating distribution, top tags, overall average, top workers, reviews; a Portfolio document | one `$facet`; `Portfolios.findOne` |

Every screen has loading, empty and error states. Technical errors stay in API responses;
`GET /api/health` reports PostgreSQL and MongoDB health separately. **Acting as client** switches the demo actor (no real login).

### Demo script (outline for the video)

1. **Explore → Contracts**, filter *In progress*, page 3, open a contract (50,000 rows, one page at a time).
2. **Fund gig**: pick an *Available* freelancer, ₹1,500, *Start work now* ✓ → escrow before/after + the DEBIT audit row.
3. Fund the same freelancer again → **already has a gig in progress** (partial unique index), nothing charged → **Mark that contract completed** → fund again: works.
4. **More than escrow** → shortfall → **Top up** → CREDIT row.
5. **Escrow**: new rows on top match the trigger ✓ (seeded history explained); *Last 30 days*.
6. **Analytics**: “N completed contracts are not in the view” → **Refresh** → time updates. Click a row in the DENSE_RANK table → that freelancer's chart.
7. **Workers map**: **Auto-add pings** on; dots appear and pulse; change job site; *Raw pings (Part A)* vs *Workers*; click the map.
8. **Reviews**: click the 1★ bar; click a top worker → their facet + portfolio; **Show raw document**.

## 4. Technology choices

| Choice | Why |
|---|---|
| **React 18 + Vite** | Small reusable component kit across seven screens; instant reload; Vite proxies `/api`, so no CORS. |
| **TanStack Query** | Loading/error/empty states, caching, `keepPreviousData` (no flicker while paging), `refetchInterval` (map polling). |
| **React Router** | Screen state in the URL (`?tab=contracts&page=3`, `?freelancer=…`): back/forward and links work. |
| **Recharts** | Declarative bar/line charts. |
| **Leaflet + OpenStreetMap** | Free tiles, no API key; SVG circles avoid Leaflet's broken marker images under Vite. |
| **Plain CSS with tokens** | The team palette (navy `#17233B`, teal `#0D8A83`, `#F6F8FA`) in one file; three breakpoints. |
| **Node + Express + `pg` + `mongodb`** | One language end to end; official drivers; Express stays thin. |
| **`node:test`** (API), **Vitest + Testing Library** (web) | API unit tests need no extra packages; the form is tested the way a user uses it. |
| **Docker Compose** | Identical PostgreSQL 16 / MongoDB 8 on every machine. |

**Principle:** the inherited database is used as-is and does the real work. The API calls `fund_gig`, reads back what
the trigger wrote, runs the Part A query file and pipelines, and translates database errors into messages
(`api/src/lib/pgErrors.js`). Anything Assignment 2 needs beyond Part A is added in the API, not the database.

## 5. Assumptions

1. **Currency is ₹** (freelancer coordinates are in Delhi NCR).
2. **The demo actor is a client** (clients fund gigs and own the escrow). No real login.
3. **“Active gig” = `IN_PROGRESS`**, as in the inherited index `idx_active_gig`: a freelancer may have several FUNDED (queued) contracts but only one in progress. **Start work now** on the form starts the new contract in the same transaction, so the index can refuse at funding time.
4. **Statuses only move forward** (FUNDED → IN_PROGRESS → COMPLETED; skipping a step is allowed), enforced by the API.
5. **Revenue = budget of COMPLETED contracts, dated by `created_at`** (no completion-date column), as in Part A.
6. **The 7-day moving average is the inherited definition** (`RANGE` over days that had revenue); its limits are discussed in the handover note, not changed.
7. **Job sites** are presets in the seeded area plus any clicked point (GigTask has no job-site table); the first preset is Part A's example point.
8. **Map default = one row per worker** (latest available ping within 5 km); Part A's raw-ping view is a toggle.
9. **Busy worker** = has an IN_PROGRESS contract in PostgreSQL; **available** = the ping's `is_available`.
10. **Simulated pings** use the seeder's exact document shape; they stand in for workers' phones.
11. **Amounts** have at most 2 decimals and are ≤ 99,999,999.99 (`DECIMAL(10,2)`); `fund_gig` decides validity.
12. **Dates** are calendar days in **Asia/Kolkata** (set on the database container).
13. Seeded contracts have **no matching audit rows**, and the seeded audit rows have random `balance_after` values (inherited seeder). The running balance is therefore computed back from each client's **current** balance; rows written by the trigger always match it.

## 6. Changes to the inherited database code

**None to existing objects.** Every file in `db/` is byte-for-byte the inherited commit `5d38fee`. One additive file:

| File | Why |
|---|---|
| `db/sql/07_ui_support.sql` (new) | table `mv_refresh_log`, because Assignment 2 must show when the materialized view was last refreshed and PostgreSQL does not record it |

Everything else Assignment 2 needs (5 km radius, overall-average facet, per-worker grouping, forward-only statuses,
running balance, top-up) is done in the API. Issues found in the inherited code are reported, not changed — see the
[handover note](docs/handover_note.md).

## 7. Screenshots

`TODO — docs/screenshots/: one per screen + one at phone width.`

## 8. Contribution

`TODO — fill in honestly; marks may be scaled for very unequal contribution, and everyone is expected in both design and code.`

| Member | Roll no. | Design | Code | Docs / tests |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |

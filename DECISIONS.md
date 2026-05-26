# DECISIONS.md — Roost

> **Living log.** This file evolves with the project. CLAUDE.md is the
> constitution (stable). This file is the journal (mutable). Read both
> together at session start.

-----

## 🎯 The “North Star” (Current Goal)

**Goal:** Build v1 of Roost — a mobile-first PWA that turns Joelle’s
Merlin-driven birding into a quiet, restrained sense of the neighborhood.
Map as front door. Field journal voice. Deck as undercurrent. eBird CSV
sync from day one.

**Vibe:** Patient and elegant. Not a weekend MVP — a soft-surprise gift
that lands well. Good things come to those who wait. Take the time to
make the aesthetic right.

**Audience for v1 reveal:** Joelle. Soft-surprise pattern — show her a
working v1, then iterate with her on v2.

-----

## 🛠 Active Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, single-file shape preferred. React
  via Babel CDN only if state complexity demands it. PWA installable.
- **Fonts:** Fraunces + Plus Jakarta Sans + DM Mono (Google Fonts CDN)
- **Backend / DB:** Cloudflare D1 (SQLite) + Pages Functions (API layer)
- **Map tiles:** Protomaps PMTiles + MapLibre GL JS + Cloudflare R2 hosting
- **External API:** eBird API 2.0 (public observations only)
- **Data ingest:** eBird “Download My Data” CSV upload
- **Hosting:** Cloudflare Pages (app + API) + D1 (database) + R2 (tiles)
- **Repo:** `Driver-cyber/roost` (public, GitHub)

-----

## 📝 Change Log (Pivots & Decisions)

### 2026-05-25 — Project initialized

- **Concept:** Companion to Merlin for Joelle. Map-as-front-door PWA.
- **Emotional center:** Field journal voice as the primary register, with
  collection and pattern elements present but in supporting roles.
  - *Considered:* collection-led (Pokédex), pattern-led (dashboard),
    story-led (pure journal). Three mockups produced; map-as-front-door
    chosen because it embodies “neighborhood as character” most literally
    while keeping the journal voice intact.
- **Merlin integration:** Decided to integrate via eBird, not Merlin
  directly.
  - *Why:* Merlin and eBird share a Cornell Lab account. Merlin prompts
    users to push sightings to eBird. eBird has a documented public API
    plus a “Download My Data” CSV export.
  - *Constraint surfaced:* eBird API does **not** expose per-user
    checklists. There is no real-time “sync Joelle’s sightings”
    endpoint. The CSV import path is the only personal-data ingest
    available.
  - *Implication for UX:* The “sync” feel has to be designed around CSV
    upload — make it feel like one step. Public eBird data refresh on
    open is real-time-feeling and covers the ambient-neighborhood feel
    well.
- **Backend:** Supabase chosen over Cloudflare KV and Firebase.
  - *Why:* Sightings are relational. Matches Cadence’s stack — reuse
    muscle memory. Free tier is comfortable for single-user scale.
  - *Open question carried over from Cadence:* key injection pattern and
    session continuity table semantics. Resolve in Cadence first, or
    make the same decisions deliberately here.
- **Map renderer:** Protomaps PMTiles + MapLibre GL JS on Cloudflare R2.
  - *Why:* No API keys. No usage tiers. Aesthetic ceiling is high enough
    to match the drawn mockup. Single static file (~MBs) covers the
    neighborhood. Fits the “no servers” stack philosophy.
  - *Ruled out:* pure SVG (locks to one neighborhood, breaks if she
    travels), Leaflet + raw OSM (lower aesthetic ceiling), Mapbox/Stadia
    hosted (API keys, billing relationship).
  - *Tradeoff accepted:* Setup learning curve is steepest of the four.
    Worth it for the recurring-cost-zero and aesthetic-ceiling-high
    payoff.
- **v1 scope:** All goodies included. Map + journal + deck + eBird public
  API + eBird CSV sync + voice line + bottom sheet feed + PWA shell.
  - *Considered:* split v1 into v1.0 (no sync) and v1.1 (with sync).
    Rejected — patient build, full surprise.
- **Name:** **Roost**.
  - *Why:* Short, warm, place-specific. Noun and verb both work. Pairs
    well with the “neighborhood as character” spine. Avoids the
    specific-street fragility of “Maplewood” and the
    real-notebook-brand collision of “Field Notes.”

### 2026-05-26 — Backend pivot: Supabase → Cloudflare D1

- **Decision:** Replace Supabase with Cloudflare D1 + Pages Functions.
- **Why:** Chad has used all Supabase free-tier accounts. D1 is free,
  lives in the same Cloudflare ecosystem as Pages and R2 (one dashboard,
  one account), and SQLite covers Roost’s relational needs without the
  overhead of hosted Postgres.
- **What changes:**
  - Backend is now D1 (SQLite at the edge) instead of Supabase (Postgres).
  - API layer is Cloudflare Pages Functions (`functions/` directory in the
    repo) instead of Supabase client SDK.
  - Auth simplifies: no Supabase Auth. Single-user bearer token for v1.
  - Migrations are `.sql` files applied via `wrangler d1 execute`.
  - Local dev uses `npx wrangler pages dev` with local D1 binding.
- **What doesn’t change:** Data model (sightings, species, places, notes),
  eBird integration, map renderer, frontend approach, deploy target.
- **Tradeoff accepted:** D1 is newer/less battle-tested than Supabase, and
  SQLite has fewer features than Postgres. Neither matters at Roost’s
  scale. The wins (zero cost, unified dashboard, simpler deploy) outweigh.
- **Cadence implication:** The Supabase open questions from Cadence no
  longer apply to Roost. The two projects now use different backends.

### Build Tracker

- **Status:** Not yet created. Add `roost-tracker.html` per the
  New-Project-Constitution-Snippet pattern when the build begins. Use
  the walnut/amber/wheat palette from that snippet for the tracker
  itself — the tracker’s aesthetic is separate from Roost’s in-app
  aesthetic.
- **Initial priorities** for the tracker when made:
1. D1 schema + Pages Functions API setup
1. PMTiles extract + R2 hosting + MapLibre custom style
1. Sighting logger (manual entry) — first working feature

-----

## ❓ Open Questions

These need answers before or during early build. Don’t proceed past the
relevant module without resolving.

- ~~**[KEYS]** Supabase key injection~~ — **Resolved.** Pivoted to D1.
  No client-side keys needed; D1 is bound server-side via wrangler.toml.
- ~~**[SESSION]** Supabase session continuity~~ — **Resolved.** No longer
  applies. Auth is a simple bearer token in Pages secrets.
- **[BOUNDS]** What’s the geographic extent of the PMTiles extract? Default
  proposal: a ~3–5 mile radius around home, generous enough to cover
  Maplewood + nearby parks + likely walking destinations. Confirm before
  extract.
- **[EBIRD KEY]** Chad’s eBird API key — request, store in environment,
  document where.
- **[CSV CADENCE]** How often does Joelle (or Chad) run the CSV export?
  Weekly? On demand? Affects UI affordances around “last synced.”
- **[HOME LOCATION]** Coordinates for the home anchor pin and the yard
  outline. Set during build, store as a config value.
- **[VOICE LINE LOGIC]** Templates for the italic top-of-map sentence —
  written by Chad/Claude as a small library, picked based on the most
  recent or most notable sighting? Sketch this in the voice-line module.

-----

## 💡 The Parking Lot (Future Ideas)

Held for v2+ or “after Joelle has lived with v1.” Not commitments. Some
will be revisited, some will be killed.

- **Real-time push notification when a new bird is logged nearby**
  (high-quality, low-frequency only — wrong if it ever feels noisy)
- **Multi-neighborhood / travel mode** — Roost away from home, when
  visiting family or on trips
- **Photo attachments on journal entries** with Macaulay Library lookup
  for reference photos
- **Family accounts / kids’ view** — neighborhood birds explained for the
  kids, in a Neighborly-adjacent register
- **Weekly digest** — a Sunday-morning email or in-app summary, written
  in the field-journal voice
- **Seasonal markers** — visual treatments on the map that shift with
  the seasons; subtle, not theme-park
- **eBird Hotspot integration** — show official birding hotspots near
  home as a third pin category, distinct from ambient
- **Voice-line library expansion** — more templates, more variety, maybe
  a “tone” setting for how chatty the top line is
- **Public Roost** — if the format ever feels worth sharing, a way for
  Joelle’s parents or sister to peek at “the Stewarts’ bird neighborhood”
  in a read-only way. Tread carefully — emotional register first.

-----

## 🚧 Current State

- **Where we are:** Founding documents complete. Mockups produced. Backend
  pivoted from Supabase to Cloudflare D1 (2026-05-26). Repo exists on
  GitHub. No app code written yet.
- **What’s next:**
1. Create D1 database in Cloudflare dashboard
1. Build Module 1: D1 schema + Pages Functions API + wrangler.toml
1. Build PWA app shell (index.html, manifest, service worker, design system)
1. Request eBird API key
1. Set up Cloudflare Pages connection to the repo
1. Create `roost-tracker.html` per the build-tracker pattern

-----

*Last updated: 2026-05-26. Update this file at the end of any session that
changes priorities or makes a decision.*
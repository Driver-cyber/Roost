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
- **Backend / DB:** Supabase (PostgreSQL)
- **Map tiles:** Protomaps PMTiles + MapLibre GL JS + Cloudflare R2 hosting
- **External API:** eBird API 2.0 (public observations only)
- **Data ingest:** eBird “Download My Data” CSV upload
- **Hosting:** Cloudflare Pages
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

### Build Tracker

- **Status:** Not yet created. Add `roost-tracker.html` per the
  New-Project-Constitution-Snippet pattern when the build begins. Use
  the walnut/amber/wheat palette from that snippet for the tracker
  itself — the tracker’s aesthetic is separate from Roost’s in-app
  aesthetic.
- **Initial priorities** for the tracker when made:
1. Supabase schema + project setup
1. PMTiles extract + R2 hosting + MapLibre custom style
1. Sighting logger (manual entry) — first working feature

-----

## ❓ Open Questions

These need answers before or during early build. Don’t proceed past the
relevant module without resolving.

- **[KEYS]** How are Supabase keys injected? Same question as Cadence —
  resolve in one place, apply to both. Don’t paste keys into source.
- **[SESSION]** What defines “session continuity” in Supabase? Carried over
  from Cadence — same answer should work for both.
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

- **Where we are:** Founding documents complete. Mockups produced. No
  code written.
- **What’s next:**
1. Resolve Cadence’s open Supabase questions (or commit to a deliberate
   approach here, applying to both projects)
1. Request eBird API key
1. Set up `Driver-cyber/roost` repo + Cloudflare Pages connection
1. Create `roost-tracker.html` per the build-tracker pattern
1. Begin Module 1 (Supabase schema)

-----

*Last updated: 2026-05-25. Update this file at the end of any session that
changes priorities or makes a decision.*
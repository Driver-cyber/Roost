# CLAUDE.md — Roost

> **Read first.** This document is the constitution for Roost. Before doing
> any work, also read `DECISIONS.md` for the current state of the project,
> open questions, and recent pivots. The two files are designed to be read
> together.

-----

## 🪶 What Roost Is

Roost is a mobile-first PWA that turns Joelle’s birding into a sense of the
neighborhood. She uses Merlin to identify and log birds. Roost takes that
data — together with public eBird sightings from the area around home — and
gives it back to her as a small, restrained social feed of nature: a map
that knows her yard, a journal that remembers what she saw and when, and a
quiet collection that grows over time.

**Roost is not a birding tool.** Merlin is the birding tool. Roost is what
makes the birds *feel like neighbors*.

### Who it’s for

- **Joelle (primary user).** A soft-surprise reveal — she’ll see v1 and then
  shape v2 with us. Design from observation in v1; iterate with her after.
- **Chad (light secondary user, builder).** Uses it to follow along, helps
  log when out together.

-----

## 🎯 The North Star

Open the app on a Tuesday morning. See one italicized sentence about a bird
that visited the yard. See the neighborhood, drawn — your home outlined,
nearby pins glowing. Feel quietly informed, not pulled in. Close the app
within thirty seconds knowing the day has already had something good in it.

That feeling is the product. Everything else is in service of it.

-----

## 🧭 Guiding Principles

These apply to every decision on this project. They come from Chad’s
user-level operating principles and are reproduced here so Claude Code has
them in cold-start context.

**Measure twice, cut once.** Before any multi-file edit or non-trivial
change, propose a plan and wait for explicit approval. Ask one more
question rather than rework later. Lean into the existing instinct to
confirm — don’t crank up friction, but don’t sprint past it either.

**Ordo ab chao.** Bring order to disparate parts; accept some chaos in the
result. Don’t let perfect be the enemy of good. The messy middle is part
of the work — don’t rush to clean it.

**Focused elegance + uncompromising utility.** The app must work. Within
that, prefer simple, beautiful, joyful paths over clever ones. Trust the
ends, enjoy the means. Joelle’s experience opening this app on a Tuesday
morning is the experience that matters.

**Token-conscious consumption.** Real-world cost to compute. Don’t
recursively scan folders or read files speculatively. Ask Chad for specific
file paths when unsure. Propose plans rather than racing to action. Don’t
over-format simple responses.

**Patterns, not procedures.** These principles are defaults. A specific
situation can override any of them with good reason — say so when it
happens.

**“idk” is a real answer.** Honesty about uncertainty beats confident
filler. If the right move isn’t clear, say so and we’ll figure it out
together.

-----

## 🏗 Architecture & Stack

### Frontend

- **Vanilla HTML/CSS/JS, single-file shape preferred where reasonable**
  (matches Cadence’s pattern; React via Babel CDN if state complexity
  demands it, but only then)
- **PWA** — installable, offline-tolerant for cached sightings, mobile-first
- **Fonts:** Fraunces (display/serif, italic register) + Plus Jakarta Sans
  (UI) + DM Mono (data/metadata). Google Fonts, no self-hosting.

### Backend

- **Cloudflare D1 (SQLite at the edge).** Single-file relational database,
  free tier covers Roost many times over (5M reads/day, 100K writes/day).
  Lives in the same Cloudflare ecosystem as Pages and R2 — one dashboard,
  one account, one deploy pipeline.
- **Cloudflare Pages Functions** serve as the thin API layer between the
  PWA and D1. They live in the `functions/` directory of this repo and
  deploy automatically with the rest of the app. No separate Worker
  project needed.
- **Auth:** Single-user for v1. Simple bearer token stored as a Cloudflare
  Pages secret. Revisit if/when multi-user matters.

### Map rendering

- **Protomaps PMTiles + MapLibre GL JS, hosted on Cloudflare R2.**
- Extract a regional PMTiles file covering Maplewood + a generous radius
  (room for walks and travel within the area). Single static file on R2.
- Custom MapLibre style sheet to achieve the paper/drawn aesthetic from the
  founding mockup — muted earth tones, soft road weights, no satellite
  imagery, no Google Maps look.
- No API keys, no usage tiers, no per-call billing.

### eBird integration

- **Public data:** eBird API 2.0, free key tied to Chad’s eBird account.
  Refresh on app open (with sensible cache to avoid hammering the API).
  Pulls recent observations near home for ambient pins and the “nearby”
  tagged items in the feed.
- **Joelle’s personal data:** eBird CSV “Download My Data” export, ingested
  by an in-app importer. She (or Chad) periodically downloads the CSV from
  My eBird and uploads it; the app parses, deduplicates, and merges into
  her sightings.
- **Important constraint:** The eBird API does not expose per-user
  checklists. There is no real-time auto-sync from Merlin. Joelle’s flow
  is: log in Merlin → submit to eBird → CSV export → Roost ingest. The app
  should make this flow feel like one step, not four.

### Hosting & deploy

- **Cloudflare Pages** for the app + API (Pages Functions).
- **Cloudflare D1** for the database.
- **Cloudflare R2** for the PMTiles file.
- All Cloudflare. One dashboard, one account.
- GitHub repo under `Driver-cyber`, public by default.

-----

## 🗺 The Three Layers (Same Data, Three Views)

Roost has one data model and three ways into it. All three coexist in v1.

**The Map** — front door. Drawn neighborhood, three pin types:

- **Rust pins:** Joelle’s logged sightings.
- **Gold pin (pinging):** today / fresh / live — her sightings *and*
  ambient eBird hits from today (visually distinguished from each other
  but both live).
- **Moss pins (smaller, dimmer):** ambient public eBird data — other
  birders nearby.

Above the map: one italic sentence in the field-journal voice (e.g., *“A
cardinal visited your maple this morning.”*). Below the map: peekable
bottom sheet — “Today on your block,” her sightings interleaved with
nearby ambient ones tagged as such.

**The Journal** — second tab. Story/memory layer. Chronological feed,
italic register, weather + time + place + optional note. Tap a map pin →
opens the relevant journal entry.

**The Deck** — third tab (labeled “birds” in the UI). Quiet collection
layer. Grid of species cards: unlocked ones lit with color, silhouette
cards for species seen nearby (via eBird) but not yet by her. Pokédex
shape, restrained execution. Not the centerpiece — the long-tail.

-----

## 🎨 Design Language

**Mood:** restrained social feed of nature. Field journal voice. Paper,
not glass. Italic seriffed display. The opposite of gregarious social
media — calm, slow, intimate, specific to *this neighborhood, this
morning*.

**Palette (working):**

- `--paper`: `#f4ede0` (warm cream, dominant)
- `--paper-warm`: `#fef6e3` (highlights, callouts)
- `--ink`: `#2b2218` (body text)
- `--ink-soft`: `#6b5d4a` (secondary text, metadata)
- `--moss`: `#4a6b3a` / `--moss-deep`: `#2f4624` (greens, ambient pins)
- `--rust`: `#b85c2e` / `--rust-deep`: `#7a2e10` (her pins, accents)
- `--gold`: `#d4a942` (today / live / fresh)
- `--sky`: `#7da7c4` (water, secondary accent)

**Type:**

- **Fraunces** (italic, weights 400/500) — voice, headings, place names
- **Plus Jakarta Sans** (400/500/600) — UI labels, buttons
- **DM Mono** — timestamps, metadata, small labels

**Non-negotiables:**

- The map is drawn, not satellite. Not Google Maps. Not Apple Maps.
- Italic Fraunces does the emotional work. Use it for voice lines, place
  names, and bird names.
- The “home” yard is always visibly marked on the map with a soft rust
  outline.
- Pin hierarchy (rust = her, gold = today, moss = ambient) is consistent
  across every screen.
- No likes, no follower counts, no streaks-as-pressure. This is not a
  social media app.

-----

## 📦 Modules (v1 Scope)

All modules in scope for v1. Patient build over a shippable but smaller v1.
Status: 🔜 = planned, 🚧 = in progress, ✅ = complete.

|# |Module                 |Status|What it does                                                         |
|--|-----------------------|------|---------------------------------------------------------------------|
|1 |D1 schema + API        |🔜     |D1 database, Pages Functions API, migrations versioned.              |
|2 |Map renderer           |🔜     |PMTiles extract for neighborhood, R2 hosting, MapLibre + custom style|
|3 |Sighting logger        |🔜     |“Add a sighting” form — species, place, time, note, optional photo   |
|4 |eBird public API client|🔜     |Recent nearby observations, refresh on app open, sensible cache      |
|5 |eBird CSV importer     |🔜     |Drop-in CSV from “Download My Data,” parse, dedupe, merge            |
|6 |Journal view           |🔜     |Chronological feed, field-journal voice, tap pin → entry             |
|7 |Deck view              |🔜     |Species grid, unlocked + silhouette cards, nearby species shown      |
|8 |Bottom sheet feed      |🔜     |“Today on your block,” interleaved her/nearby sightings              |
|9 |Voice line generator   |🔜     |The one italic sentence at the top of map view (template + data)     |
|10|PWA shell              |🔜     |Install prompt, service worker, offline-tolerant cache               |

-----

## 🚫 Out of Scope (for v1)

|Item                                        |Why                                          |Revisit                           |
|--------------------------------------------|---------------------------------------------|----------------------------------|
|Real-time Merlin → app sync                 |Platform doesn’t support it. CSV is the path.|If eBird ever opens per-user API  |
|Multi-neighborhood / travel mode            |v1 is Maplewood. Joelle’s actual world.      |v2, after she lives with v1       |
|Social features (sharing sightings publicly)|Wrong emotional register                     |Probably never                    |
|Streaks, badges, leaderboards               |Wrong emotional register                     |Probably never                    |
|Push notifications                          |Adds pressure; wrong feel for v1             |After Joelle asks for it          |
|Bird call playback / audio ID               |Merlin does this                             |Not Roost’s job                   |
|Photo gallery / Macaulay integration        |Photos in journal entries are enough         |v2 if it lands well               |
|Kids’ view / family accounts                |Single-user v1                               |If/when family-app pattern emerges|

-----

## 🔄 Maintenance Protocol

**After completing each module:** Prompt Chad — “should I update
DECISIONS.md?” Updates go in the Change Log section with date and rationale.

**After any pivot or significant scope change:** Stop. Confirm with Chad
that we’re pivoting. Then update both files together — CLAUDE.md if the
constitution changed, DECISIONS.md always.

**At the start of a new session after a gap of days or more:** Re-read
DECISIONS.md. State briefly what we last did and what’s next, before
proposing any work. A session restart is a natural red-team trigger.

**Red team checkpoints:**

- After every 2–3 completed modules
- At any session restart after a multi-day gap
- Before declaring v1 “done”
  Adversarial framing: argue against the recent decisions, defend them, then
  mark each as **Confirmed**, **Revised**, or **Scheduled** for later
  revisit. Vague “looks good” outcomes don’t count.

-----

## 📋 Session Startup Checklist

Every session, in order:

1. Read this file.
1. Read `DECISIONS.md`.
1. Briefly say where the project is and what’s next, before doing
   anything else.
1. If the request is non-trivial, propose a plan and wait for approval.
1. If a file path isn’t clear, ask — don’t grep, don’t recursively scan.

-----

## 🛠 Build & Run

- **Local dev:** `npx wrangler pages dev` (serves static files + Functions
  + D1 local binding)
- **Deploy:** Push to `main` on the GitHub repo → Cloudflare Pages auto-builds
- **D1:** Database bound to Pages project via `wrangler.toml`. Migrations
  in `db/migrations/`, applied via `wrangler d1 execute`.
- **R2 / PMTiles:** PMTiles file hosted at `[TBD URL on R2]`; MapLibre
  loads via `pmtiles://` protocol

These will be filled in as built. Document them here, not in scattered
comments, so next session has them in cold-start context.

-----

*Constitution v1 — drafted in planning session on May 25, 2026.*
*This document is not final. Pivots are expected. Update DECISIONS.md when
they happen.*
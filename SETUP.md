# SETUP.md — Roost

> **What this file is.** A procedure document, not a constitution. Read
> CLAUDE.md and DECISIONS.md first for what we’re building and why. This
> file is the *how to get the build infrastructure stood up* document, and
> the ongoing *async workflow guide* once it’s running.
> 
> Most of this is one-time. After initial setup, Roost development is
> phone-first and browser-first. No terminal needed for day-to-day work.

-----

## 🧰 The Stack at a Glance

|Layer              |Tool                           |How you access it day-to-day  |
|-------------------|-------------------------------|------------------------------|
|Code editing       |github.dev or Codespaces       |Browser (works on phone too)  |
|Heavy code lifts   |Claude Code in Cowork          |Desktop, async — hand it tasks|
|Code review / merge|GitHub iOS app                 |Phone                         |
|Deploy             |Cloudflare Pages (auto on push)|Web dashboard / iOS app       |
|Database           |Supabase                       |Web dashboard / iOS app       |
|Tile storage       |Cloudflare R2                  |Web dashboard, drag and drop  |
|Live testing       |Cloudflare preview URLs        |Open on your phone            |
|Planning / design  |Claude (chat app)              |Phone or browser              |

**What you don’t need:** Expo server, certificate signing, App Store
submission, a running local dev server most of the time, native build
tools. PWAs install through the browser; you skip the entire native-app
deployment pipeline.

-----

## 🚀 One-Time Setup Checklist

Do this in one focused session. Estimated time: 60–90 minutes including
waiting for things to provision. After this, you’re in async/mobile flow.

### 1. GitHub repo

- [ ] Create `Driver-cyber/roost` (public). Web UI only.
- [ ] Add `CLAUDE.md`, `DECISIONS.md`, `SETUP.md` (this file).
- [ ] Add `README.md` with one paragraph + link to CLAUDE.md.
- [ ] Add `.gitignore` (Node defaults are fine even though we’re vanilla,
  for future-proofing).

### 2. Cloudflare Pages

- [ ] Cloudflare dashboard → Pages → Connect to Git → pick the roost repo.
- [ ] Build settings: framework preset `None`, build command empty,
  output directory `/` (we’re vanilla; nothing to compile).
- [ ] Production branch: `main`. Preview deploys: all other branches /
  PRs. **Important — preview deploys are how you’ll test on your
  phone.**
- [ ] Custom domain (later): `roost.chadstewartcpa.com` or similar via
  Cloudflare DNS.

### 3. Supabase

- [ ] Create new project. Pick a region close to home.
- [ ] Copy the project URL and `anon` public key. These go into
  Cloudflare Pages environment variables, **not** into source.
- [ ] In Cloudflare Pages → Settings → Environment variables, add:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- [ ] **This is the moment to resolve the Cadence open question** about
  key injection. Whatever pattern you land on, apply it here too.
  Document the resolution in both projects’ DECISIONS.md.
- [ ] Schema work is deferred to Module 1 of the build — don’t try to
  design tables in setup. Just stand the project up.

### 4. eBird API key

- [ ] Sign in to eBird with the account Joelle uses (or your shared
  Cornell Lab account if you have one — confirm this with her).
- [ ] Request an API key: <https://ebird.org/api/keygen>
- [ ] Add to Cloudflare Pages env vars as `EBIRD_API_KEY`.
- [ ] **Note:** eBird’s API key is technically tied to an account. Make
  sure the account it’s tied to is one Joelle has access to, since
  she’ll be the source of personal data via CSV. Cleanest: one
  shared eBird account for the household.

### 5. PMTiles map file

Two paths — pick one based on your phone-vs-desktop comfort that day.

**Path A — Web extractor (no terminal):**

- [ ] Go to <https://maps.protomaps.com/> and use the area selector to
  draw a box around Maplewood + generous radius (3–5 miles out).
- [ ] Download the resulting `.pmtiles` file to your machine.

**Path B — Hand it to Claude Code in Cowork:**

- [ ] In Cowork, give Claude Code the task: “Download the latest world
  build from <https://maps.protomaps.com/builds/>, run
  `pmtiles extract` with bounding box `[your coords]`, output
  `roost-neighborhood.pmtiles`. Confirm file size is under 50 MB
  before finishing.”
- [ ] Claude Code runs it; you get the file.

Either path: bounding box coordinates can come from <http://bboxfinder.com/>

### 6. Upload PMTiles to Cloudflare R2

- [ ] Cloudflare dashboard → R2 → Create bucket → name it `roost-tiles`.
- [ ] Enable public access for the bucket (or set up a custom domain
  route — public access is fine for v1).
- [ ] Drag and drop the `.pmtiles` file into the bucket via the web UI.
- [ ] Copy the public URL of the file. Add to Cloudflare Pages env vars
  as `PMTILES_URL`.

### 7. Verify everything

- [ ] Make a trivial commit to `main` (e.g., update README).
- [ ] Watch Cloudflare Pages auto-deploy.
- [ ] Open the deployed URL on your phone. Should load (even if it’s
  just a hello-world).
- [ ] You’re set up.

-----

## 📱 Ongoing Async Workflow

Once setup is done, this is the loop:

### For small edits (copy tweaks, color adjustments, single-file changes)

1. On phone or laptop: open `github.com/Driver-cyber/roost`.
1. Press `.` (or change `github.com` to `github.dev` in the URL) — opens
   VS Code in the browser.
1. Edit, commit directly to a branch named for the change.
1. Open a PR.
1. Cloudflare auto-deploys a preview URL on the PR.
1. Open the preview URL on your phone. Confirm it looks right.
1. Merge from GitHub iOS app.
1. `main` deploys to production automatically.

### For non-trivial work (new module, schema change, feature)

1. In this chat or a new Claude chat: plan the work. Get to a clear spec.
1. Hand the spec to Claude Code in Cowork. Reference CLAUDE.md and
   DECISIONS.md by name so it loads them.
1. Claude Code works async. Opens a PR when done.
1. Review the PR on GitHub iOS app. Read the diff. Open the preview URL
   on your phone.
1. Comment on the PR if changes needed; merge if good.
1. Update DECISIONS.md after merge if anything was decided in the work.

### For testing

- **Live preview URLs** are your QA device. Every PR gets one. Open on
  Joelle’s iPhone model (or yours) and use it like a real user.
- **No `localhost`-on-laptop loop required.** You can have one if you
  want — clone the repo, open `index.html` in a browser — but it’s
  optional and shouldn’t be the primary feedback channel.

### For database work

- **Supabase web SQL editor** for schema changes, manual inspection,
  one-off queries.
- **Supabase iOS app** for monitoring usage, checking logs, viewing
  tables on the go.
- **Migrations:** save as `.sql` files in the repo under `db/migrations/`
  so they’re version-controlled. Apply via SQL editor.

### For map style work

- MapLibre styles are JSON. Edit in github.dev like any other file.
- Reload the preview URL to see changes.
- The MapLibre style spec is documented and Claude can help with
  specific changes (color tokens, road weights, label fonts).

-----

## ⚠️ Things to Know About PWAs on iOS

iOS Safari is the test target since Joelle uses an iPhone. A few rough
edges to keep in mind:

- **Install prompt is manual.** No browser-driven install banner like
  Android. Joelle has to use Share → “Add to Home Screen.” Plan for a
  one-time onboarding screen that walks her through it.
- **Service workers are stricter.** Cache lifetimes are shorter, eviction
  is more aggressive. Don’t assume offline-everything; assume
  offline-the-recent-stuff.
- **iOS PWAs don’t get push notifications by default** without extra
  setup (Web Push on iOS 16.4+ requires the PWA to be installed to home
  screen). Not a v1 concern but worth knowing.
- **Standalone mode quirks:** when launched from home screen, the PWA
  doesn’t share cookies with Safari. Auth has to be handled inside the
  PWA’s own context.

None of these are blockers. They’re just the kind of thing that bites
you in week three if you didn’t know going in.

-----

## 🔐 Secrets & Environment Variables

**Never commit secrets to the repo.** Everything sensitive lives in
Cloudflare Pages env vars:

- `SUPABASE_URL` — public, but kept in env for cleanliness
- `SUPABASE_ANON_KEY` — public (it’s the anon key; row-level security
  is what protects data), but kept in env
- `EBIRD_API_KEY` — keep in env
- `PMTILES_URL` — public, but env’d for environment swapping
- `HOME_LAT` / `HOME_LON` — Joelle’s home coordinates for the anchor
  pin. Not secret but environment-specific.

For local development if you ever want it: a `.env.example` file in the
repo with empty values, and a `.env` file (gitignored) with real values.

-----

## 🆘 When Something Goes Wrong

Common phone-friendly debugging moves:

- **Deploy failed:** Check Cloudflare Pages → Deployments → click the
  failed deploy → read the build log. Usually a typo or missing env var.
- **App loads but map doesn’t render:** Open the deploy URL in mobile
  Safari, then Settings → Safari → Advanced → Web Inspector to attach
  from a Mac. Or check the browser console on desktop via the same
  preview URL.
- **Database query failing:** Supabase dashboard → SQL editor → run the
  query directly. Logs tab shows what the app tried.
- **CSV import not parsing:** Open the CSV in a spreadsheet app on
  phone, eyeball the column names. eBird occasionally changes export
  formats; the parser may need an update.

When stuck, drop the symptom into a Claude chat with a copy of the
relevant error. Don’t suffer in silence — that’s the whole point of
having a thinking partner.

-----

## 📚 Reference Links

Save these. You’ll come back to them.

- **eBird API docs:** <https://documenter.getpostman.com/view/664302/S1ENwy59>
- **eBird “Download My Data”:** <https://ebird.org/downloadMyData>
- **Protomaps docs:** <https://docs.protomaps.com/>
- **Protomaps web extractor:** <https://maps.protomaps.com/>
- **MapLibre GL JS docs:** <https://maplibre.org/maplibre-gl-js/docs/>
- **MapLibre style spec:** <https://maplibre.org/maplibre-style-spec/>
- **Supabase JS client:** <https://supabase.com/docs/reference/javascript/>
- **Cloudflare Pages docs:** <https://developers.cloudflare.com/pages/>
- **PWA on iOS quirks:** <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>

-----

*SETUP.md v1 — drafted in planning session on May 25, 2026. Update when
the setup procedure changes or when new async-workflow patterns emerge.*
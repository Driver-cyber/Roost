-- Roost — Initial Schema
-- Apply via: wrangler d1 execute roost-db --file=db/migrations/001_initial_schema.sql
-- Or paste into Cloudflare D1 Console tab.

-- Species reference table. One row per species, populated from eBird taxonomy
-- and expanded as new species appear in sightings or CSV imports.
CREATE TABLE IF NOT EXISTS species (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    common_name TEXT NOT NULL,
    scientific_name TEXT,
    species_code TEXT UNIQUE,
    family_name TEXT,
    "order" TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Places — named locations (yard, park, trail). The home yard is always id=1.
CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    radius_m REAL,
    is_home INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sightings — the core table. Each row is one observation of one species
-- at one place and time. Source tracks where the data came from.
CREATE TABLE IF NOT EXISTS sightings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id INTEGER NOT NULL REFERENCES species(id),
    place_id INTEGER REFERENCES places(id),
    observed_at TEXT NOT NULL,
    lat REAL,
    lon REAL,
    count INTEGER,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    ebird_checklist_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notes — freeform journal entries attached to a sighting or standalone.
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sighting_id INTEGER REFERENCES sightings(id),
    body TEXT NOT NULL,
    weather TEXT,
    mood TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sightings_observed_at ON sightings(observed_at);
CREATE INDEX IF NOT EXISTS idx_sightings_species_id ON sightings(species_id);
CREATE INDEX IF NOT EXISTS idx_sightings_source ON sightings(source);
CREATE INDEX IF NOT EXISTS idx_sightings_ebird_checklist ON sightings(ebird_checklist_id);
CREATE INDEX IF NOT EXISTS idx_species_code ON species(species_code);
CREATE INDEX IF NOT EXISTS idx_species_common_name ON species(common_name);

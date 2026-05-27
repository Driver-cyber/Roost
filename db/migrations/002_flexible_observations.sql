-- Roost — Flexible Schema (v2)
-- A single observations table with JSON payload for maximum flexibility.
-- Apply via: wrangler d1 execute roost-db --file=db/migrations/002_flexible_observations.sql

-- The one table to hold everything: fauna, flora, journal entries, eBird data.
CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,                          -- 'fauna', 'flora', 'journal'
    title TEXT NOT NULL,                         -- 'American Crow', 'Blackberries', 'Rain on the leaves'
    observed_at TEXT NOT NULL,
    lat REAL,
    lon REAL,
    source TEXT NOT NULL DEFAULT 'manual',        -- 'manual', 'ebird', 'csv'
    zone TEXT,                                   -- 'yard', 'block', 'nearby', null
    payload TEXT NOT NULL DEFAULT '{}',           -- JSON: count, notes, species_code, scientific_name, weather, photo, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_obs_observed_at ON observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_obs_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_obs_source ON observations(source);
CREATE INDEX IF NOT EXISTS idx_obs_zone ON observations(zone);

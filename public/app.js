// ================================================================
// Roost — App Logic
// ================================================================

const API = '/api';
const HOME = { lat: 45.6191, lon: -122.5484 };

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
let state = {
  sightings: [],
  species: [],
  places: [],
  map: null,
  mapReady: false,
};

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModal();
  initCSVImport();
  initMap();
  loadData();
});

// ----------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  const voiceWrap = document.getElementById('voice-line-wrap');
  const fab = document.getElementById('fab-add');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.view;
      tabs.forEach(t => t.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');

      voiceWrap.style.display = target === 'view-map' ? '' : 'none';
      fab.style.display = target === 'view-deck' ? 'none' : '';
    });
  });
}

// ----------------------------------------------------------------
// Modal (Add Sighting)
// ----------------------------------------------------------------
function initModal() {
  const overlay = document.getElementById('modal-add');
  const fab = document.getElementById('fab-add');
  const form = document.getElementById('form-sighting');
  const csvSection = document.getElementById('csv-import-section');
  const btnImport = document.getElementById('btn-import-csv');
  const btnBack = document.getElementById('btn-back-manual');

  // Set default date/time
  const now = new Date();
  document.getElementById('input-date').value = now.toISOString().split('T')[0];
  document.getElementById('input-time').value = now.toTimeString().slice(0, 5);

  fab.addEventListener('click', () => {
    overlay.classList.add('open');
    // Reset to manual form
    form.style.display = '';
    csvSection.style.display = 'none';
    // Refresh date/time
    const n = new Date();
    document.getElementById('input-date').value = n.toISOString().split('T')[0];
    document.getElementById('input-time').value = n.toTimeString().slice(0, 5);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  btnImport.addEventListener('click', () => {
    form.style.display = 'none';
    csvSection.style.display = '';
  });

  btnBack.addEventListener('click', () => {
    form.style.display = '';
    csvSection.style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const species = document.getElementById('input-species').value.trim();
    const date = document.getElementById('input-date').value;
    const time = document.getElementById('input-time').value;
    const count = document.getElementById('input-count').value;
    const notes = document.getElementById('input-notes').value.trim();

    if (!species) return;

    const observed_at = date && time ? `${date}T${time}:00` : new Date().toISOString();

    const sighting = {
      common_name: species,
      observed_at,
      count: count ? parseInt(count) : 1,
      notes: notes || null,
      lat: HOME.lat,
      lon: HOME.lon,
      source: 'manual',
    };

    // Save locally immediately for responsiveness
    const localEntry = {
      id: Date.now(),
      ...sighting,
      species_code: null,
      scientific_name: null,
      place_name: null,
    };
    state.sightings.unshift(localEntry);
    renderAll();

    overlay.classList.remove('open');
    form.reset();
    toast(`${species} added to your journal`);

    // Try to save to API
    try {
      await fetch(`${API}/sightings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sighting),
      });
    } catch (_) {
      // Offline — sighting is in local state, will sync later
    }
  });
}

// ----------------------------------------------------------------
// CSV Import
// ----------------------------------------------------------------
function initCSVImport() {
  const drop = document.getElementById('csv-drop');
  const fileInput = document.getElementById('csv-file');
  const progress = document.getElementById('import-progress');
  const progressFill = document.getElementById('progress-fill');
  const status = document.getElementById('import-status');

  drop.addEventListener('click', () => fileInput.click());

  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  });

  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));

  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    if (e.dataTransfer.files.length) processCSV(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) processCSV(fileInput.files[0]);
  });

  async function processCSV(file) {
    progress.classList.add('active');
    status.textContent = 'Reading file...';
    progressFill.style.width = '10%';

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length < 2) {
      status.textContent = 'No data found in file.';
      return;
    }

    const headers = parseCSVLine(lines[0]);
    const nameCol = headers.findIndex(h => /common.?name/i.test(h));
    const sciCol = headers.findIndex(h => /scientific.?name/i.test(h));
    const dateCol = headers.findIndex(h => /^date$/i.test(h));
    const timeCol = headers.findIndex(h => /^time$/i.test(h));
    const countCol = headers.findIndex(h => /^observation.?count$/i.test(h));
    const latCol = headers.findIndex(h => /latitude/i.test(h));
    const lonCol = headers.findIndex(h => /longitude/i.test(h));
    const locCol = headers.findIndex(h => /location$/i.test(h));
    const codeCol = headers.findIndex(h => /species.?code/i.test(h));
    const checklistCol = headers.findIndex(h => /submission.?id/i.test(h));

    if (nameCol === -1) {
      status.textContent = 'Could not find "Common Name" column.';
      return;
    }

    const dataLines = lines.slice(1);
    let imported = 0;
    let skipped = 0;
    const existingIds = new Set(state.sightings.map(s => s.ebird_checklist_id).filter(Boolean));

    status.textContent = `Processing ${dataLines.length} records...`;

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCSVLine(dataLines[i]);
      if (!cols[nameCol]) { skipped++; continue; }

      const checklistId = checklistCol !== -1 ? cols[checklistCol] : null;
      if (checklistId && existingIds.has(checklistId)) { skipped++; continue; }

      const date = dateCol !== -1 ? cols[dateCol] : '';
      const time = timeCol !== -1 ? cols[timeCol] : '00:00';
      const observed_at = date ? `${date}T${time}:00` : new Date().toISOString();
      const rawCount = countCol !== -1 ? cols[countCol] : '1';

      const sighting = {
        common_name: cols[nameCol],
        scientific_name: sciCol !== -1 ? cols[sciCol] : null,
        species_code: codeCol !== -1 ? cols[codeCol] : null,
        observed_at,
        count: rawCount === 'X' ? null : parseInt(rawCount) || 1,
        lat: latCol !== -1 ? parseFloat(cols[latCol]) || null : null,
        lon: lonCol !== -1 ? parseFloat(cols[lonCol]) || null : null,
        place_name: locCol !== -1 ? cols[locCol] : null,
        source: 'csv',
        ebird_checklist_id: checklistId,
      };

      state.sightings.push(sighting);
      if (checklistId) existingIds.add(checklistId);
      imported++;

      if (i % 50 === 0) {
        const pct = Math.round(((i + 1) / dataLines.length) * 90) + 10;
        progressFill.style.width = pct + '%';
        status.textContent = `Imported ${imported} of ${dataLines.length}...`;
        await new Promise(r => setTimeout(r, 0)); // yield to UI
      }
    }

    progressFill.style.width = '100%';
    status.textContent = `Done! ${imported} sightings imported, ${skipped} skipped.`;

    // Rebuild species list from sightings
    rebuildSpeciesFromSightings();
    renderAll();
    toast(`${imported} sightings imported from eBird`);

    // Try bulk save to API
    try {
      for (const s of state.sightings.filter(s => s.source === 'csv')) {
        await fetch(`${API}/sightings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        });
      }
    } catch (_) { /* offline — will sync later */ }
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ----------------------------------------------------------------
// Data Loading
// ----------------------------------------------------------------
async function loadData() {
  try {
    const [sRes, spRes] = await Promise.all([
      fetch(`${API}/sightings?limit=200`),
      fetch(`${API}/species`),
    ]);
    if (sRes.ok) {
      const data = await sRes.json();
      state.sightings = data.sightings || [];
    }
    if (spRes.ok) {
      const data = await spRes.json();
      state.species = data.species || [];
    }
  } catch (_) {
    // Offline — use whatever's in local state
  }

  // Load eBird ambient data
  try {
    const ebirdRes = await fetch(`${API}/ebird-nearby`);
    if (ebirdRes.ok) {
      const data = await ebirdRes.json();
      const ebirdSightings = (data.observations || []).map(obs => ({
        id: 'ebird-' + obs.species_code + '-' + obs.observed_at,
        common_name: obs.common_name,
        scientific_name: obs.scientific_name,
        species_code: obs.species_code,
        lat: obs.lat,
        lon: obs.lon,
        observed_at: obs.observed_at,
        count: obs.count,
        place_name: obs.location_name,
        source: 'ebird',
      }));
      state.sightings = [...state.sightings, ...ebirdSightings];
    }
  } catch (_) {
    // eBird unavailable — app works fine without it
  }

  rebuildSpeciesFromSightings();
  renderAll();
}

function rebuildSpeciesFromSightings() {
  const speciesMap = new Map();
  for (const s of state.sightings) {
    const name = s.common_name;
    if (!name) continue;
    if (!speciesMap.has(name)) {
      speciesMap.set(name, {
        common_name: name,
        scientific_name: s.scientific_name,
        species_code: s.species_code,
        sighting_count: 0,
        last_seen: s.observed_at,
      });
    }
    const sp = speciesMap.get(name);
    sp.sighting_count++;
    if (s.observed_at > sp.last_seen) sp.last_seen = s.observed_at;
  }
  state.species = Array.from(speciesMap.values()).sort((a, b) =>
    a.common_name.localeCompare(b.common_name)
  );
}

// ----------------------------------------------------------------
// Render everything
// ----------------------------------------------------------------
function renderAll() {
  renderVoiceLine();
  renderTodayFeed();
  renderJournal();
  renderDeck();
  renderMapPins();
}

// ----------------------------------------------------------------
// Voice Line
// ----------------------------------------------------------------
const voiceTemplates = [
  (s) => `A ${s.common_name.toLowerCase()} was spotted nearby this morning.`,
  (s) => `${s.common_name} — visiting the neighborhood again.`,
  (s) => `Someone saw a ${s.common_name.toLowerCase()} not far from here.`,
  (s) => `The ${s.common_name.toLowerCase()} is back.`,
  (s) => `A quiet morning. A ${s.common_name.toLowerCase()} stopped by.`,
  (s) => `This morning's visitor: ${s.common_name.toLowerCase()}.`,
  (s) => `A ${s.common_name.toLowerCase()} passed through your corner of the world.`,
  (s) => `The neighborhood heard from a ${s.common_name.toLowerCase()} today.`,
];

const fallbackVoiceLines = [
  'Listening for the neighborhood...',
  'The yard is quiet this morning.',
  'No new visitors yet — but the day is young.',
  'A still morning. The birds will come.',
];

function renderVoiceLine() {
  const el = document.getElementById('voice-text');
  const today = new Date().toISOString().split('T')[0];
  const todaySightings = state.sightings.filter(s => s.observed_at?.startsWith(today));

  if (todaySightings.length > 0) {
    const latest = todaySightings[0];
    const template = voiceTemplates[Math.floor(Math.random() * voiceTemplates.length)];
    el.textContent = template(latest);
  } else if (state.sightings.length > 0) {
    const latest = state.sightings[0];
    const daysAgo = Math.floor((Date.now() - new Date(latest.observed_at)) / 86400000);
    if (daysAgo <= 3) {
      el.textContent = `Last seen: a ${latest.common_name.toLowerCase()}, ${daysAgo === 0 ? 'earlier today' : daysAgo === 1 ? 'yesterday' : daysAgo + ' days ago'}.`;
    } else {
      el.textContent = fallbackVoiceLines[Math.floor(Math.random() * fallbackVoiceLines.length)];
    }
  } else {
    el.textContent = fallbackVoiceLines[Math.floor(Math.random() * fallbackVoiceLines.length)];
  }

  // Re-trigger animation
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}

// ----------------------------------------------------------------
// Today Feed (bottom sheet)
// ----------------------------------------------------------------
function renderTodayFeed() {
  const container = document.getElementById('today-feed');
  const countEl = document.getElementById('today-count');
  const today = new Date().toISOString().split('T')[0];
  const todaySightings = state.sightings.filter(s => s.observed_at?.startsWith(today));

  if (todaySightings.length === 0) {
    // Show most recent sightings instead
    const recent = state.sightings.slice(0, 5);
    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No sightings yet.</p>
          <span class="hint">Tap + to log your first bird.</span>
        </div>`;
      countEl.textContent = '';
      return;
    }

    document.querySelector('.bottom-sheet-header h2').textContent = 'Recent sightings';
    countEl.textContent = `${recent.length} latest`;
    container.innerHTML = recent.map(s => feedItemHTML(s)).join('');
    return;
  }

  document.querySelector('.bottom-sheet-header h2').textContent = 'Today on your block';
  countEl.textContent = `${todaySightings.length} sighting${todaySightings.length !== 1 ? 's' : ''}`;
  container.innerHTML = todaySightings.map(s => feedItemHTML(s)).join('');
}

function feedItemHTML(s) {
  const dotClass = s.source === 'ebird' ? 'moss' : isToday(s.observed_at) ? 'gold' : 'rust';
  const time = formatTime(s.observed_at);
  const sourceLabel = s.source === 'ebird' ? 'nearby' : s.source === 'csv' ? 'eBird' : '';
  const detail = [s.place_name, sourceLabel].filter(Boolean).join(' · ');

  return `
    <div class="feed-item">
      <div class="feed-dot ${dotClass}"></div>
      <div class="feed-text">
        <div class="bird-name">${s.common_name}</div>
        ${detail ? `<div class="feed-detail">${detail}</div>` : ''}
        <div class="meta">${time}${s.count ? ' · ' + s.count + ' seen' : ''}</div>
      </div>
    </div>`;
}

// ----------------------------------------------------------------
// Journal
// ----------------------------------------------------------------
function renderJournal() {
  const container = document.getElementById('journal-entries');
  const countEl = document.getElementById('journal-species-count');

  if (state.sightings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📓</div>
        <p>Your journal is waiting.</p>
        <span class="hint">Each sighting becomes a story.</span>
      </div>`;
    countEl.textContent = '';
    return;
  }

  countEl.textContent = `${state.species.length} species`;

  // Group by date
  const groups = {};
  for (const s of state.sightings) {
    const date = s.observed_at?.split('T')[0] || 'Unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(s);
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  container.innerHTML = sortedDates.map(date => {
    const entries = groups[date];
    return `
      <div class="journal-date-group">
        <div class="journal-date-label">${formatDateLabel(date)}</div>
        ${entries.map(s => {
          const dotClass = s.source === 'ebird' ? 'moss' : 'rust';
          return `
            <div class="journal-entry">
              <div class="entry-top">
                <div class="entry-dot feed-dot ${dotClass}"></div>
                <div class="entry-species">${s.common_name}</div>
              </div>
              ${s.notes ? `<div class="entry-body">${s.notes}</div>` : ''}
              <div class="entry-meta">
                <span>${formatTime(s.observed_at)}</span>
                ${s.count ? `<span>${s.count} seen</span>` : ''}
                ${s.place_name ? `<span class="entry-place">${s.place_name}</span>` : ''}
                ${s.source === 'csv' ? '<span>via eBird</span>' : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }).join('');
}

// ----------------------------------------------------------------
// Deck (species cards)
// ----------------------------------------------------------------
const BIRD_ICONS = {
  default: '🐦',
  'Northern Cardinal': '🔴',
  'Blue Jay': '🔵',
  'American Robin': '🟠',
  'House Sparrow': '🟤',
  'American Goldfinch': '🟡',
  'Red-tailed Hawk': '🦅',
  'Great Blue Heron': '🦢',
  'Bald Eagle': '🦅',
  'Ruby-throated Hummingbird': '💚',
  'Mourning Dove': '🕊️',
  'American Crow': '⬛',
  'Black-capped Chickadee': '⚪',
  'White-breasted Nuthatch': '🔹',
  'Downy Woodpecker': '🔲',
  'Red-bellied Woodpecker': '🔶',
  'Song Sparrow': '🟫',
  'Dark-eyed Junco': '⚫',
  'Tufted Titmouse': '🔘',
  'European Starling': '✨',
  'Cedar Waxwing': '🟨',
  'Carolina Wren': '🧡',
  'Eastern Bluebird': '💙',
};

function renderDeck() {
  const grid = document.getElementById('deck-grid');
  const stats = document.getElementById('deck-stats');

  if (state.species.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🪺</div>
        <p>Your collection starts here.</p>
        <span class="hint">Each new species unlocks a card.</span>
      </div>`;
    stats.textContent = '';
    return;
  }

  const seen = state.species.filter(s => s.sighting_count > 0);
  stats.textContent = `${seen.length} seen`;

  grid.innerHTML = state.species.map(sp => {
    const isSeen = sp.sighting_count > 0;
    const icon = BIRD_ICONS[sp.common_name] || BIRD_ICONS.default;
    const badge = sp.last_seen && isToday(sp.last_seen) ? '<div class="card-badge"></div>' : '';

    return `
      <div class="deck-card ${isSeen ? 'seen' : 'unseen'}">
        ${badge}
        <div class="card-icon">${icon}</div>
        <div class="card-name">${sp.common_name}</div>
        ${isSeen ? `<div class="card-count">${sp.sighting_count}×</div>` : ''}
      </div>`;
  }).join('');
}

// ----------------------------------------------------------------
// Map
// ----------------------------------------------------------------
function initMap() {
  state.map = new maplibregl.Map({
    container: 'map',
    style: mapStyle(),
    center: [HOME.lon, HOME.lat],
    zoom: 14,
    attributionControl: false,
    maxZoom: 18,
    minZoom: 10,
  });

  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

  // Hide loading overlay on load or after timeout
  const hideLoading = () => {
    document.getElementById('map-loading').classList.add('hidden');
  };
  setTimeout(hideLoading, 4000);

  state.map.on('load', () => {
    state.mapReady = true;
    hideLoading();

    // Home marker
    const homeEl = document.createElement('div');
    homeEl.className = 'home-marker';
    new maplibregl.Marker({ element: homeEl })
      .setLngLat([HOME.lon, HOME.lat])
      .addTo(state.map);

    renderMapPins();
  });
}

function mapStyle() {
  return {
    version: 8,
    name: 'Roost Paper',
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }
    },
    layers: [
      {
        id: 'carto-base',
        type: 'raster',
        source: 'carto-light',
        paint: {
          'raster-saturation': -0.65,
          'raster-brightness-min': 0.12,
          'raster-brightness-max': 0.88,
          'raster-contrast': -0.08,
          'raster-hue-rotate': 30,
          'raster-opacity': 0.9,
        }
      }
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  };
}

let mapMarkers = [];

function renderMapPins() {
  if (!state.mapReady) return;

  // Clear old markers
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];

  for (const s of state.sightings) {
    if (!s.lat || !s.lon) continue;

    const isRecent = isToday(s.observed_at);
    const pinClass = s.source === 'ebird' ? 'pin-moss' :
                     isRecent ? 'pin-gold' : 'pin-rust';

    const el = document.createElement('div');
    el.className = `pin ${pinClass}`;

    const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
      .setHTML(`
        <div style="font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; padding: 2px 4px;">
          ${s.common_name}
        </div>
        <div style="font-family: 'DM Mono', monospace; font-size: 10px; color: #6b5d4a; padding: 0 4px 2px;">
          ${formatTime(s.observed_at)}
        </div>
      `);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([s.lon, s.lat])
      .setPopup(popup)
      .addTo(state.map);

    mapMarkers.push(marker);
  }
}

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------
function isToday(dateStr) {
  if (!dateStr) return false;
  return dateStr.startsWith(new Date().toISOString().split('T')[0]);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  } catch (_) { return ''; }
}

function formatDateLabel(dateStr) {
  if (!dateStr || dateStr === 'Unknown') return 'Unknown';
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

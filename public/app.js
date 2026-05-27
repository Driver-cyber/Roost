// ================================================================
// Roost — App Logic
// ================================================================

const API = '/api';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('roost-auth-token');
  const headers = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
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

const STORAGE_KEY = 'roost-observations';

function saveLocal() {
  const manual = state.sightings.filter(s => s.source === 'manual' || s.source === 'csv');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(manual)); } catch (_) {}
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (_) { return []; }
}

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModal();
  initCSVImport();
  initDrawer();
  initBingo();
  initTrophies();
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

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.view;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      views.forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(target).classList.add('active');

      voiceWrap.style.display = target === 'view-map' ? '' : 'none';

      // Scroll view container to top on tab switch
      document.querySelector('.view-container').scrollTop = 0;
    });
  });
}

// ----------------------------------------------------------------
// Modal (Add Sighting)
// ----------------------------------------------------------------
function initModal() {
  const overlay = document.getElementById('modal-add');
  const fab = document.getElementById('fab-add');
  const fabContainer = document.getElementById('fab-container');
  const fabBackdrop = document.getElementById('fab-backdrop');
  const form = document.getElementById('form-sighting');
  const csvSection = document.getElementById('csv-import-section');
  const btnImport = document.getElementById('btn-import-csv');
  const btnBack = document.getElementById('btn-back-manual');

  // Set default date/time
  const now = new Date();
  document.getElementById('input-date').value = now.toISOString().split('T')[0];
  document.getElementById('input-time').value = now.toTimeString().slice(0, 5);

  // Type chip selection
  const typeChips = document.querySelectorAll('.type-chip');
  let selectedType = 'fauna';
  const placeholders = { fauna: 'e.g., Vaux\'s Swift, Coyote', flora: 'e.g., Douglas Fir, Blackberries', journal: 'What did you notice?' };
  const labels = { fauna: 'What creature?', flora: 'What plant?', journal: 'Describe the moment' };

  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedType = chip.dataset.type;
      document.getElementById('input-species').placeholder = placeholders[selectedType];
      document.getElementById('input-species-label').textContent = labels[selectedType];
      const countGroup = document.getElementById('input-count').closest('.form-group');
      countGroup.style.display = selectedType === 'journal' ? 'none' : '';
    });
  });

  // Radial FAB toggle
  fab.addEventListener('click', () => {
    fabContainer.classList.toggle('open');
    fabBackdrop.classList.toggle('open');
  });

  fabBackdrop.addEventListener('click', () => {
    fabContainer.classList.remove('open');
    fabBackdrop.classList.remove('open');
  });

  // FAB option buttons
  document.querySelectorAll('.fab-option').forEach(btn => {
    btn.addEventListener('click', () => {
      fabContainer.classList.remove('open');
      fabBackdrop.classList.remove('open');
      const type = btn.dataset.type;
      openLogModal(type);
    });
  });

  function openLogModal(type) {
    openOverlay(overlay);
    form.style.display = '';
    csvSection.style.display = 'none';
    // Refresh date/time
    const n = new Date();
    document.getElementById('input-date').value = n.toISOString().split('T')[0];
    document.getElementById('input-time').value = n.toTimeString().slice(0, 5);

    // Set the active type chip
    selectedType = type;
    typeChips.forEach(c => c.classList.remove('active'));
    const matchingChip = document.querySelector(`.type-chip[data-type="${type}"]`);
    if (matchingChip) matchingChip.classList.add('active');

    // Update placeholder, label, and count visibility
    document.getElementById('input-species').placeholder = placeholders[type];
    document.getElementById('input-species-label').textContent = labels[type];
    const countGroup = document.getElementById('input-count').closest('.form-group');
    countGroup.style.display = type === 'journal' ? 'none' : '';
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay(overlay);
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

    const observation = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: selectedType,
      title: species,
      common_name: species,
      observed_at,
      lat: HOME.lat,
      lon: HOME.lon,
      source: 'manual',
      zone: 'yard',
      count: selectedType === 'journal' ? null : (count ? parseInt(count) : 1),
      notes: notes || null,
    };

    state.sightings.unshift(observation);
    saveLocal();
    renderAll();

    closeOverlay(overlay);
    form.reset();
    toast(`${species} added to your journal`);

    try {
      await fetch(`${API}/sightings`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(observation),
      });
    } catch (_) {}
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
          headers: authHeaders({ 'Content-Type': 'application/json' }),
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
  // Local observations are the foundation
  state.sightings = loadLocal();

  // Layer in server-side observations
  try {
    const sRes = await fetch(`${API}/sightings?limit=200`);
    if (sRes.ok) {
      const data = await sRes.json();
      const serverObs = (data.sightings || []).map(s => ({
        ...s,
        common_name: s.common_name || s.title,
        title: s.title || s.common_name,
      }));
      const localIds = new Set(state.sightings.map(s => s.id));
      for (const obs of serverObs) {
        if (!localIds.has(obs.id)) state.sightings.push(obs);
      }
    }
  } catch (_) {}

  // Layer in eBird ambient data with proximity matching
  try {
    const ebirdRes = await fetch(`${API}/ebird-nearby`);
    if (ebirdRes.ok) {
      const data = await ebirdRes.json();
      const ebirdSightings = (data.observations || []).map(obs => {
        const distM = haversineM(HOME.lat, HOME.lon, obs.lat, obs.lon);
        const isYard = distM < 100;
        const isBlock = distM < 250;
        return {
          id: 'ebird-' + obs.species_code + '-' + obs.observed_at,
          type: 'fauna',
          title: obs.common_name,
          common_name: obs.common_name,
          scientific_name: obs.scientific_name,
          species_code: obs.species_code,
          lat: obs.lat,
          lon: obs.lon,
          observed_at: obs.observed_at,
          count: obs.count,
          place_name: isYard ? 'Your yard' : isBlock ? 'Your block' : obs.location_name,
          source: isBlock ? 'home' : 'ebird',
          zone: isYard ? 'yard' : isBlock ? 'block' : 'nearby',
        };
      });
      state.sightings = [...state.sightings, ...ebirdSightings];
    }
  } catch (_) {}

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
  renderExplore();
  renderMapPins();
}

// ----------------------------------------------------------------
// Voice Line
// ----------------------------------------------------------------
function aAn(name) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

const voiceTemplates = [
  (s) => { const n = s.common_name.toLowerCase(); return `${aAn(n).replace(/^./, c => c.toUpperCase())} ${n} was spotted nearby this morning.`; },
  (s) => `${s.common_name} — visiting the neighborhood again.`,
  (s) => { const n = s.common_name.toLowerCase(); return `Someone saw ${aAn(n)} ${n} not far from here.`; },
  (s) => `The ${s.common_name.toLowerCase()} is back.`,
  (s) => { const n = s.common_name.toLowerCase(); return `A quiet morning. ${aAn(n).replace(/^./, c => c.toUpperCase())} ${n} stopped by.`; },
  (s) => `This morning's visitor: ${s.common_name.toLowerCase()}.`,
  (s) => { const n = s.common_name.toLowerCase(); return `${aAn(n).replace(/^./, c => c.toUpperCase())} ${n} passed through your corner of the world.`; },
  (s) => { const n = s.common_name.toLowerCase(); return `The neighborhood heard from ${aAn(n)} ${n} today.`; },
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
      const n = latest.common_name.toLowerCase();
      el.textContent = `Last seen: ${aAn(n)} ${n}, ${daysAgo === 0 ? 'earlier today' : daysAgo === 1 ? 'yesterday' : daysAgo + ' days ago'}.`;
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
  const isYours = s.source === 'home' || s.source === 'manual' || s.source === 'csv';
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

function renderExplore() {
  renderExplorePrompt();
  renderExploreQuests();
  renderExploreStats();
  renderExploreCollection();
}

function renderExplorePrompt() {
  const icon = document.getElementById('prompt-icon');
  const text = document.getElementById('prompt-text');
  const meta = document.getElementById('prompt-meta');
  const subtitle = document.getElementById('explore-subtitle');

  const hour = new Date().getHours();
  const todaySightings = state.sightings.filter(s => isToday(s.observed_at));
  const speciesCount = new Set(state.sightings.map(s => s.common_name)).size;

  subtitle.textContent = `${speciesCount} species nearby`;

  const prompts = [];
  if (hour < 9) {
    prompts.push({ i: '🌅', t: 'The dawn chorus is happening right now. Step outside and listen — what do you hear?', m: 'best before 8am' });
  } else if (hour < 12) {
    prompts.push({ i: '☀️', t: 'Good morning for a walk. The neighborhood has been active today.', m: `${todaySightings.length} sightings so far` });
  } else if (hour < 17) {
    prompts.push({ i: '🌿', t: 'Afternoon light is good for noticing things. What\'s blooming on your block?', m: 'log a plant, animal, or moment' });
  } else if (hour < 20) {
    prompts.push({ i: '🌆', t: 'Evening walk? The crows are heading to roost. Follow them.', m: 'golden hour' });
  } else {
    prompts.push({ i: '🌙', t: 'Listen to the night. What\'s still awake out there?', m: 'night sounds' });
  }

  if (state.sightings.length > 0) {
    const recent = state.sightings[0];
    prompts.push({ i: '📍', t: `A ${recent.common_name.toLowerCase()} was seen nearby. Can you spot one too?`, m: recent.place_name || 'your neighborhood' });
  }

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  icon.textContent = prompt.i;
  text.textContent = prompt.t;
  meta.textContent = prompt.m;
}

function renderExploreQuests() {
  const container = document.getElementById('explore-quests');
  const todaySpecies = new Set(state.sightings.filter(s => isToday(s.observed_at)).map(s => s.common_name));
  const totalSpecies = new Set(state.sightings.map(s => s.common_name)).size;

  const quests = [
    {
      icon: '🚶',
      title: 'Take the long way home',
      desc: 'Walk a different route today. Log anything alive you notice — bird, plant, bug, or moment.',
      reward: 'Explorer badge',
    },
    {
      icon: '🌳',
      title: 'Name three plants on your block',
      desc: 'Look at what\'s growing. A tree, a flower, a weed — they\'re all neighbors.',
      reward: 'Botanist badge',
    },
    {
      icon: '👂',
      title: 'Stand still for one minute',
      desc: 'Close your eyes outside. Count the different sounds you hear.',
      reward: 'Listener badge',
    },
  ];

  if (todaySpecies.size < 3) {
    quests.unshift({
      icon: '🔭',
      title: `Spot ${3 - todaySpecies.size} more species today`,
      desc: `You've seen ${todaySpecies.size} so far. Three is the daily rhythm.`,
      reward: 'Daily rhythm badge',
    });
  }

  container.innerHTML = quests.slice(0, 3).map(q => `
    <div class="explore-card quest-card">
      <div class="quest-icon">${q.icon}</div>
      <div>
        <div class="quest-title">${q.title}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-reward">${q.reward}</div>
      </div>
    </div>
  `).join('');
}

function renderExploreStats() {
  const container = document.getElementById('explore-stats');
  const totalSpecies = new Set(state.sightings.map(s => s.common_name)).size;
  const totalSightings = state.sightings.length;
  const yourSightings = state.sightings.filter(s => s.source === 'home' || s.source === 'manual' || s.source === 'csv').length;
  const nearbySightings = state.sightings.filter(s => s.source === 'ebird').length;

  container.innerHTML = `
    <div class="stat-row"><span class="stat-label">Species nearby</span><span class="stat-value">${totalSpecies}</span></div>
    <div class="stat-row"><span class="stat-label">Total sightings</span><span class="stat-value">${totalSightings}</span></div>
    <div class="stat-row"><span class="stat-label">Your observations</span><span class="stat-value">${yourSightings}</span></div>
    <div class="stat-row"><span class="stat-label">Neighborhood activity</span><span class="stat-value">${nearbySightings}</span></div>
  `;
}

function renderExploreCollection() {
  const grid = document.getElementById('explore-collection');

  if (state.species.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🪺</div>
        <p>Your collection starts here.</p>
        <span class="hint">Each new species unlocks a card.</span>
      </div>`;
    return;
  }

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
                     isRecent ? 'pin-gold' :
                     (s.source === 'home' || s.source === 'manual' || s.source === 'csv') ? 'pin-rust' : 'pin-moss';

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
// Settings Drawer
// ----------------------------------------------------------------
function initDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const btnOpen = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-drawer-close');
  const btnImport = document.getElementById('btn-drawer-import');

  btnOpen.addEventListener('click', () => openOverlay(overlay));
  btnClose.addEventListener('click', () => closeOverlay(overlay));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay(overlay);
  });

  btnImport.addEventListener('click', () => {
    closeOverlay(overlay);
    const addModal = document.getElementById('modal-add');
    openOverlay(addModal);
    document.getElementById('form-sighting').style.display = 'none';
    document.getElementById('csv-import-section').style.display = '';
  });

  // Auth token
  const tokenInput = document.getElementById('input-auth-token');
  const tokenBtn = document.getElementById('btn-save-token');
  const authStatus = document.getElementById('auth-status');
  const saved = localStorage.getItem('roost-auth-token');
  if (saved) authStatus.textContent = 'Token saved ✓';

  tokenBtn.addEventListener('click', () => {
    const val = tokenInput.value.trim();
    if (val) {
      localStorage.setItem('roost-auth-token', val);
      tokenInput.value = '';
      authStatus.textContent = 'Token saved ✓';
      toast('Auth token saved');
    }
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const manual = state.sightings.filter(s => s.source === 'manual' || s.source === 'csv');
    const data = {
      exported_at: new Date().toISOString(),
      version: 2,
      count: manual.length,
      observations: manual,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roost-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported');
  });
}

// ----------------------------------------------------------------
// Bingo
// ----------------------------------------------------------------
const BINGO_STORAGE_KEY = 'roost-bingo';
const TROPHY_STORAGE_KEY = 'roost-trophies';

const BINGO_TEMPLATES = [
  { icon: '👀', task: (sp) => `Spot a ${sp}`, type: 'species' },
  { icon: '🎵', task: () => 'Hear birdsong', type: 'general' },
  { icon: '🌅', task: () => 'See a bird before 9am', type: 'time' },
  { icon: '3️⃣', task: () => 'See 3 different species', type: 'count3' },
  { icon: '🏠', task: () => 'Spot a bird from your yard', type: 'yard' },
  { icon: '✈️', task: () => 'See a bird in flight', type: 'general' },
  { icon: '🌳', task: () => 'Notice a bird in a tree', type: 'general' },
  { icon: '💧', task: () => 'Spot a bird near water', type: 'general' },
  { icon: '🪶', task: () => 'Find a feather', type: 'general' },
  { icon: '📸', task: () => 'Take a bird photo', type: 'general' },
  { icon: '2️⃣', task: () => 'See the same species twice', type: 'general' },
  { icon: '🎨', task: (sp) => `Spot a ${sp}`, type: 'species' },
  { icon: '🔭', task: (sp) => `Look for a ${sp}`, type: 'species' },
  { icon: '🐦', task: () => 'Log any sighting', type: 'any' },
  { icon: '☀️', task: () => 'Bird before noon', type: 'time' },
  { icon: '🦅', task: () => 'See a raptor', type: 'general' },
  { icon: '5️⃣', task: () => 'See 5 birds total', type: 'count5' },
];

function initBingo() {
  const bingoModal = document.getElementById('modal-bingo');
  document.getElementById('btn-bingo').addEventListener('click', () => {
    closeOverlay(document.getElementById('drawer-overlay'));
    openBingo();
  });
  document.getElementById('btn-bingo-close').addEventListener('click', () => {
    closeOverlay(bingoModal);
  });
  bingoModal.addEventListener('click', (e) => {
    if (e.target === bingoModal) closeOverlay(bingoModal);
  });
}

function openBingo() {
  const modal = document.getElementById('modal-bingo');
  openOverlay(modal);
  renderBingo();
}

function getBingoSeed() {
  return new Date().toISOString().split('T')[0];
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return function() {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h % 1000) / 1000;
  };
}

function generateBingoCard() {
  const seed = getBingoSeed();
  const rand = seededRandom(seed);

  // Get nearby species for species-specific challenges
  const nearbySpecies = [...new Set(
    state.sightings.filter(s => s.source === 'ebird' || s.source === 'home')
      .map(s => s.common_name)
  )];

  const shuffled = [...BINGO_TEMPLATES].sort(() => rand() - 0.5);
  const cells = [];

  for (let i = 0; i < 9 && i < shuffled.length; i++) {
    const tmpl = shuffled[i];
    let task;
    if (tmpl.type === 'species' && nearbySpecies.length > 0) {
      const sp = nearbySpecies[Math.floor(rand() * nearbySpecies.length)];
      task = tmpl.task(sp);
    } else if (tmpl.type === 'species') {
      task = 'Spot any bird';
    } else {
      task = tmpl.task();
    }
    cells.push({ icon: tmpl.icon, task, type: tmpl.type, completed: false });
  }

  return { seed, cells };
}

function loadBingoState() {
  try {
    const saved = JSON.parse(localStorage.getItem(BINGO_STORAGE_KEY) || '{}');
    if (saved.seed === getBingoSeed()) return saved;
  } catch (_) {}
  return null;
}

function saveBingoState(bingoState) {
  localStorage.setItem(BINGO_STORAGE_KEY, JSON.stringify(bingoState));
}

function renderBingo() {
  const grid = document.getElementById('bingo-grid');
  const dateEl = document.getElementById('bingo-date');
  const rewardEl = document.getElementById('bingo-reward');

  let bingoState = loadBingoState();
  if (!bingoState) {
    bingoState = generateBingoCard();
    saveBingoState(bingoState);
  }

  const today = new Date();
  dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Auto-check based on today's sightings
  autoCheckBingo(bingoState);

  grid.innerHTML = bingoState.cells.map((cell, i) => `
    <div class="bingo-cell ${cell.completed ? 'completed' : ''}" data-idx="${i}">
      <div class="bingo-icon">${cell.icon}</div>
      <div class="bingo-task">${cell.task}</div>
    </div>
  `).join('');

  // Tap to manually complete
  grid.querySelectorAll('.bingo-cell:not(.completed)').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      bingoState.cells[idx].completed = true;
      saveBingoState(bingoState);
      renderBingo();
    });
  });

  // Check for completed rows or full card
  const completedCount = bingoState.cells.filter(c => c.completed).length;
  const hasRow = checkBingoRows(bingoState.cells);

  if (completedCount === 9) {
    rewardEl.innerHTML = `
      <div class="reward-egg">🥚</div>
      <div class="reward-text">Full card! You earned a Golden Egg!</div>
    `;
    awardTrophy('golden-egg', '🥚', 'Golden Egg', getBingoSeed());
  } else if (hasRow) {
    rewardEl.innerHTML = `
      <div class="reward-egg">🪺</div>
      <div class="reward-text">Bingo! Row complete!</div>
    `;
    awardTrophy('bingo-row', '🪺', 'Bingo Row', getBingoSeed());
  } else {
    rewardEl.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ink-faint);">${completedCount}/9 — tap a square when you complete it</div>`;
  }

  // Update badge in drawer
  const badge = document.getElementById('bingo-badge');
  if (badge) badge.textContent = completedCount > 0 ? `${completedCount}/9` : '';
}

function autoCheckBingo(bingoState) {
  const todaySightings = state.sightings.filter(s => isToday(s.observed_at));
  const todaySpecies = [...new Set(todaySightings.map(s => s.common_name))];

  for (const cell of bingoState.cells) {
    if (cell.completed) continue;

    if (cell.type === 'any' && todaySightings.length > 0) {
      cell.completed = true;
    } else if (cell.type === 'count3' && todaySpecies.length >= 3) {
      cell.completed = true;
    } else if (cell.type === 'count5' && todaySightings.length >= 5) {
      cell.completed = true;
    } else if (cell.type === 'yard' && todaySightings.some(s => s.source === 'home' || s.source === 'manual')) {
      cell.completed = true;
    } else if (cell.type === 'species') {
      const target = cell.task.replace(/^(Spot a |Look for a )/, '').toLowerCase();
      if (todaySpecies.some(sp => sp.toLowerCase() === target)) {
        cell.completed = true;
      }
    }
  }
  saveBingoState(bingoState);
}

function checkBingoRows(cells) {
  const rows = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return rows.some(row => row.every(i => cells[i].completed));
}

// ----------------------------------------------------------------
// Trophy Case
// ----------------------------------------------------------------
function initTrophies() {
  const trophyModal = document.getElementById('modal-trophies');
  document.getElementById('btn-trophies').addEventListener('click', () => {
    closeOverlay(document.getElementById('drawer-overlay'));
    openTrophies();
  });
  document.getElementById('btn-trophies-close').addEventListener('click', () => {
    closeOverlay(trophyModal);
  });
  trophyModal.addEventListener('click', (e) => {
    if (e.target === trophyModal) closeOverlay(trophyModal);
  });
}

function openTrophies() {
  const modal = document.getElementById('modal-trophies');
  openOverlay(modal);
  renderTrophies();
}

function loadTrophies() {
  try {
    return JSON.parse(localStorage.getItem(TROPHY_STORAGE_KEY) || '[]');
  } catch (_) { return []; }
}

function awardTrophy(type, icon, label, date) {
  const trophies = loadTrophies();
  if (trophies.some(t => t.type === type && t.date === date)) return;
  trophies.push({ type, icon, label, date });
  localStorage.setItem(TROPHY_STORAGE_KEY, JSON.stringify(trophies));

  const countEl = document.getElementById('trophy-count');
  if (countEl) countEl.textContent = trophies.length;

  toast(`${icon} ${label} earned!`);
}

function renderTrophies() {
  const grid = document.getElementById('trophy-grid');
  const empty = document.getElementById('trophy-empty');
  const trophies = loadTrophies();

  const countEl = document.getElementById('trophy-count');
  if (countEl) countEl.textContent = trophies.length || '';

  if (trophies.length === 0) {
    grid.innerHTML = '';
    empty.textContent = 'Complete bingo challenges to earn trophies.';
    return;
  }

  empty.textContent = '';
  grid.innerHTML = trophies.map(t => `
    <div class="trophy-item">
      <div class="trophy-icon">${t.icon}</div>
      <div class="trophy-label">${t.label}<br>${t.date}</div>
    </div>
  `).join('');
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

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// Open/close overlay helpers — manage body scroll lock + aria state
function openOverlay(el) {
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeOverlay(el) {
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  // Only remove body lock if no other overlays are open
  const anyOpen = document.querySelector('.modal-overlay.open, .drawer-overlay.open');
  if (!anyOpen) document.body.classList.remove('modal-open');
}

// Prevent iOS Safari from scrolling the page when focusing inputs in modals
// The visual viewport API lets us detect when the keyboard opens and adjust
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    // When keyboard opens, iOS shrinks the visual viewport.
    // Ensure open modals stay visible by adjusting max-height.
    const openModal = document.querySelector('.modal-overlay.open .modal');
    if (openModal) {
      const vh = window.visualViewport.height;
      openModal.style.maxHeight = (vh * 0.85) + 'px';
    }
  });

  window.visualViewport.addEventListener('scroll', () => {
    // Prevent iOS Safari from scrolling the fixed-position page
    // when focusing form inputs inside modals
    if (document.body.classList.contains('modal-open')) {
      window.scrollTo(0, 0);
    }
  });
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await env.DB.prepare(`
    SELECT s.id, s.observed_at, s.lat, s.lon, s.count, s.notes, s.source,
           sp.common_name, sp.scientific_name, sp.species_code,
           p.name as place_name
    FROM sightings s
    JOIN species sp ON s.species_id = sp.id
    LEFT JOIN places p ON s.place_id = p.id
    ORDER BY s.observed_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  return Response.json({ sightings: results });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token || token !== env.AUTH_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { species_code, common_name, scientific_name, place_id, observed_at, lat, lon, count, notes, source } = body;

  if (!common_name || !observed_at) {
    return Response.json({ error: 'common_name and observed_at are required' }, { status: 400 });
  }

  let speciesId;
  if (species_code) {
    const existing = await env.DB.prepare(
      'SELECT id FROM species WHERE species_code = ?'
    ).bind(species_code).first();

    if (existing) {
      speciesId = existing.id;
    } else {
      const insert = await env.DB.prepare(
        'INSERT INTO species (common_name, scientific_name, species_code) VALUES (?, ?, ?)'
      ).bind(common_name, scientific_name || null, species_code).run();
      speciesId = insert.meta.last_row_id;
    }
  } else {
    const existing = await env.DB.prepare(
      'SELECT id FROM species WHERE common_name = ?'
    ).bind(common_name).first();

    if (existing) {
      speciesId = existing.id;
    } else {
      const insert = await env.DB.prepare(
        'INSERT INTO species (common_name, scientific_name) VALUES (?, ?)'
      ).bind(common_name, scientific_name || null).run();
      speciesId = insert.meta.last_row_id;
    }
  }

  const result = await env.DB.prepare(`
    INSERT INTO sightings (species_id, place_id, observed_at, lat, lon, count, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    speciesId,
    place_id || null,
    observed_at,
    lat || null,
    lon || null,
    count || null,
    notes || null,
    source || 'manual'
  ).run();

  return Response.json({ id: result.meta.last_row_id, species_id: speciesId }, { status: 201 });
}

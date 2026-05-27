export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const type = url.searchParams.get('type');

  let query = 'SELECT * FROM observations';
  const binds = [];

  if (type) {
    query += ' WHERE type = ?';
    binds.push(type);
  }

  query += ' ORDER BY observed_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...binds).all();

  const observations = results.map(row => ({
    ...row,
    payload: JSON.parse(row.payload || '{}'),
  }));

  return Response.json({ sightings: observations });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token || token !== env.AUTH_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, title, common_name, observed_at, lat, lon, source, zone, count, notes, species_code, scientific_name } = body;

  const obsTitle = title || common_name;
  if (!obsTitle || !observed_at) {
    return Response.json({ error: 'title and observed_at required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const obsType = type || 'fauna';
  const payload = JSON.stringify({
    ...(count != null && { count }),
    ...(notes && { notes }),
    ...(species_code && { species_code }),
    ...(scientific_name && { scientific_name }),
  });

  await env.DB.prepare(`
    INSERT INTO observations (id, type, title, observed_at, lat, lon, source, zone, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    obsType,
    obsTitle,
    observed_at,
    lat || null,
    lon || null,
    source || 'manual',
    zone || null,
    payload
  ).run();

  return Response.json({ id }, { status: 201 });
}

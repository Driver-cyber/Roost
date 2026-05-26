export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(`
    SELECT id, name, lat, lon, radius_m, is_home, notes
    FROM places ORDER BY is_home DESC, name
  `).all();

  return Response.json({ places: results });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token || token !== env.AUTH_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, lat, lon, radius_m, is_home, notes } = await request.json();

  if (!name || lat == null || lon == null) {
    return Response.json({ error: 'name, lat, and lon are required' }, { status: 400 });
  }

  const result = await env.DB.prepare(`
    INSERT INTO places (name, lat, lon, radius_m, is_home, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(name, lat, lon, radius_m || null, is_home ? 1 : 0, notes || null).run();

  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

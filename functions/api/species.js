export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(`
    SELECT title as common_name,
           COUNT(*) as sighting_count,
           MAX(observed_at) as last_seen,
           type
    FROM observations
    GROUP BY title
    ORDER BY common_name
  `).all();

  return Response.json({ species: results });
}

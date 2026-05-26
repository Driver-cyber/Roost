export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(`
    SELECT sp.id, sp.common_name, sp.scientific_name, sp.species_code, sp.family_name,
           COUNT(s.id) as sighting_count,
           MAX(s.observed_at) as last_seen
    FROM species sp
    LEFT JOIN sightings s ON sp.id = s.species_id
    GROUP BY sp.id
    ORDER BY sp.common_name
  `).all();

  return Response.json({ species: results });
}

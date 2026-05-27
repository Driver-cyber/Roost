export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    'SELECT * FROM observations ORDER BY observed_at DESC'
  ).all();

  const observations = results.map(row => ({
    ...row,
    payload: JSON.parse(row.payload || '{}'),
  }));

  const data = {
    exported_at: new Date().toISOString(),
    version: 2,
    count: observations.length,
    observations,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="roost-export.json"',
    },
  });
}

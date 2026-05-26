export async function onRequestGet(context) {
  const { env } = context;

  if (!env.EBIRD_API_KEY) {
    return Response.json({ error: 'eBird API key not configured' }, { status: 503 });
  }

  const lat = env.HOME_LAT || '40.7312';
  const lon = env.HOME_LON || '-74.2732';
  const radius = env.EBIRD_RADIUS_KM || '5';
  const days = env.EBIRD_DAYS_BACK || '7';

  const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lon}&dist=${radius}&back=${days}&maxResults=100`;

  const res = await fetch(url, {
    headers: { 'X-eBirdApiToken': env.EBIRD_API_KEY },
  });

  if (!res.ok) {
    return Response.json({ error: 'eBird API error', status: res.status }, { status: 502 });
  }

  const observations = await res.json();

  const simplified = observations.map(obs => ({
    common_name: obs.comName,
    scientific_name: obs.sciName,
    species_code: obs.speciesCode,
    lat: obs.lat,
    lon: obs.lng,
    observed_at: obs.obsDt,
    count: obs.howMany || null,
    location_name: obs.locName,
    source: 'ebird',
  }));

  return Response.json(
    { observations: simplified },
    { headers: { 'Cache-Control': 'public, max-age=900' } }
  );
}

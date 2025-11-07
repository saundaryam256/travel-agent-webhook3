// services/flights.js
const fetch = require('node-fetch');

const TEQUILA_KEY = process.env.TEQUILA_API_KEY; // Kiwi / Tequila API
if (!TEQUILA_KEY) {
  console.warn('TEQUILA_API_KEY not set. Flight searches will fail until you set it in .env');
}

/**
 * Helper: find IATA/city id for a free-text city using Tequila locations endpoint.
 * Returns a location code (city code or IATA) suitable for search.
 */
async function findLocationCode(term) {
  if (!TEQUILA_KEY) throw new Error('Tequila API key not configured');
  const q = encodeURIComponent(term);
  const url = `https://tequila-api.kiwi.com/locations/query?term=${q}&location_types=city&limit=1`;
  const res = await fetch(url, { headers: { apikey: TEQUILA_KEY } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Tequila locations error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  if (!data.locations || data.locations.length === 0) {
    // fallback: try airport type
    const url2 = `https://tequila-api.kiwi.com/locations/query?term=${q}&location_types=airport&limit=1`;
    const res2 = await fetch(url2, { headers: { apikey: TEQUILA_KEY } });
    if (!res2.ok) throw new Error('Tequila fallback failed');
    const d2 = await res2.json();
    if (!d2.locations || d2.locations.length === 0) throw new Error('No location found for ' + term);
    return d2.locations[0].id;
  }
  return data.locations[0].id;
}

/**
 * Search flights via Tequila search endpoint.
 * Input object: { origin, destination, date (YYYY-MM-DD or empty), travelClass }
 * Returns an array of simplified flight result objects.
 */
async function searchFlights({ origin, destination, date, travelClass = 'economy' }) {
  if (!TEQUILA_KEY) throw new Error('Tequila API key not configured');

  // Convert city names to location ids (Tequila accepts city id or iata)
  const originCode = await findLocationCode(origin);
  const destCode = await findLocationCode(destination);

  const params = new URLSearchParams();
  params.set('fly_from', originCode);
  params.set('fly_to', destCode);
  if (date) {
    // Tequila expects dd/mm/YYYY date range fields; we'll accept a single date and set a ±0 range
    const d = date;
    // try converting ISO date to dd/mm/YYYY
    const parts = d.split('-');
    if (parts.length === 3) {
      const ddmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;
      params.set('dateFrom', ddmmyyyy);
      params.set('dateTo', ddmmyyyy);
    }
  } else {
    // default search from today to next 7 days
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateFrom = `${dd}/${mm}/${yyyy}`;
    const future = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
    const dd2 = String(future.getDate()).padStart(2, '0');
    const mm2 = String(future.getMonth() + 1).padStart(2, '0');
    const yyyy2 = future.getFullYear();
    const dateTo = `${dd2}/${mm2}/${yyyy2}`;
    params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
  }

  params.set('flight_type', 'oneway');
  params.set('one_for_city', '1');
  params.set('max_stopovers', '2');
  params.set('limit', '10');
  params.set('curr', 'USD');

  const url = `https://tequila-api.kiwi.com/v2/search?${params.toString()}`;
  const res = await fetch(url, { headers: { apikey: TEQUILA_KEY } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Tequila search error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  if (!data.data) return [];

  // Map results to simplified objects
  const results = data.data.map((r) => {
    const route = r.route && r.route[0];
    return {
      airline: route ? route.airline : (r.airlines && r.airlines[0]) || 'Unknown',
      flight_no: route ? `${route.airline}${route.flight_no}` : 'N/A',
      departure_time: route ? new Date(route.local_departure).toLocaleString() : 'N/A',
      arrival_time: route ? new Date(route.local_arrival).toLocaleString() : 'N/A',
      price: r.price,
      currency: r.currency || data.currency || 'USD',
      deep_link: r.deep_link || null
    };
  });
  return results;
}

module.exports = { searchFlights, findLocationCode };

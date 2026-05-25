export function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} м`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

export function estimateEtaMinutes(meters: number, mode: 'walk' | 'drive') {
  const speedMps = mode === 'walk' ? 1.4 : 11.1;
  return Math.max(1, Math.round(meters / speedMps / 60));
}

export function formatEtaMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}


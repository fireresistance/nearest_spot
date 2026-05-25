export function generateCoverPoints(
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
  subRadiusMeters: number,
): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [{ lat: centerLat, lon: centerLon }];

  if (radiusMeters <= subRadiusMeters) return points;

  const earthR = 6371000;
  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegLat = (Math.PI * earthR) / 180;
  const metersPerDegLon = (Math.PI * earthR * Math.cos(latRad)) / 180;

  const step = subRadiusMeters * 1.5;
  const gridLat = Math.ceil(radiusMeters / step);
  const gridLon = Math.ceil(radiusMeters / step);

  const seen = new Set<string>();
  const key = (lat: number, lon: number) => `${lat.toFixed(4)},${lon.toFixed(4)}`;
  seen.add(key(centerLat, centerLon));

  for (let i = -gridLat; i <= gridLat; i++) {
    for (let j = -gridLon; j <= gridLon; j++) {
      const dLat = (i * step) / metersPerDegLat;
      const dLon = (j * step) / metersPerDegLon;
      const lat = centerLat + dLat;
      const lon = centerLon + dLon;

      const dist = haversine(centerLat, centerLon, lat, lon);
      if (dist > radiusMeters) continue;

      const k = key(lat, lon);
      if (seen.has(k)) continue;
      seen.add(k);
      points.push({ lat, lon });
    }
  }

  const maxPoints = 12;
  if (points.length > maxPoints) {
    const center = points[0];
    const rest = points.slice(1);
    const shuffled = rest.sort(() => Math.random() - 0.5);
    return [center, ...shuffled.slice(0, maxPoints - 1)];
  }

  return points;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

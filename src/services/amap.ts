import type { Place } from '../types/place';

const AMAP_API_URL = 'https://restapi.amap.com/v3/place/around';
const FETCH_TIMEOUT_MS = 12000;

const SCENIC_TYPES = '170000|140200|140100';
const SCENIC_TYPES_WITH_CULTURE = '170000|140200|140100|110000';

type AmapPoi = {
  id: string;
  name: string;
  type: string;
  location: string;
  address: string;
  pname: string;
  cityname: string;
  adname: string;
  distance: string;
  tel: string;
  photos?: string;
  rating?: string;
  cost?: string;
};

type AmapAroundResponse = {
  status: string;
  info: string;
  pois: AmapPoi[];
  count: string;
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NearestSpot/1.2 (Android; https://github.com/nearestspot)',
        'Accept': 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parsePhotos(photosStr: string | undefined): string | undefined {
  if (!photosStr) return undefined;
  try {
    const photos = JSON.parse(photosStr) as Array<{ url: string }>;
    if (photos.length > 0 && photos[0].url) {
      return photos[0].url;
    }
  } catch {
    const match = photosStr.match(/"url"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }
  return undefined;
}

export async function fetchNearbyPlacesAmap(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  limit: number;
  amapKey: string;
  requireImage: boolean;
}): Promise<Place[]> {
  if (!params.amapKey) {
    throw new Error('Amap API ключ не указан');
  }

  const radiusMeters = Math.min(500000, Math.max(100, Math.round(params.radiusMeters)));
  const location = `${params.lon},${params.lat}`;

  const typeSets = [SCENIC_TYPES, SCENIC_TYPES_WITH_CULTURE];
  let lastError: string | null = null;

  for (const types of typeSets) {
    const url = new URL(AMAP_API_URL);
    url.searchParams.set('key', params.amapKey);
    url.searchParams.set('location', location);
    url.searchParams.set('radius', String(radiusMeters));
    url.searchParams.set('types', types);
    url.searchParams.set('sortrule', 'distance');
    url.searchParams.set('offset', String(Math.min(25, params.limit)));
    url.searchParams.set('page', '1');
    url.searchParams.set('extensions', 'all');

    console.log('[AMAP] fetch:', url.toString().substring(0, 120));

    try {
      const res = await fetchWithTimeout(url.toString());
      if (!res.ok) {
        lastError = `Amap HTTP ${res.status}`;
        continue;
      }

      const data = (await res.json()) as AmapAroundResponse;
      if (data.status !== '1') {
        lastError = `Amap: ${data.info}`;
        continue;
      }

      const pois = data.pois ?? [];
      const places = pois
        .map<Place | null>((poi) => {
          const parts = poi.location.split(',');
          if (parts.length !== 2) return null;
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (isNaN(lat) || isNaN(lon)) return null;

          const thumbnailUrl = parsePhotos(poi.photos);
          if (params.requireImage && !thumbnailUrl) return null;

          const titleParts = [poi.name];
          if (poi.type) {
            const typeCat = poi.type.split(';')[0];
            if (typeCat && typeCat !== poi.name) {
              // keep type for context
            }
          }

          const description = [poi.address, poi.type?.split(';').filter(Boolean).join(' · ') ?? '']
            .filter(Boolean)
            .join('\n');

          return {
            id: `amap:${poi.id}`,
            title: poi.name,
            lat,
            lon,
            distanceMeters: poi.distance ? parseInt(poi.distance, 10) : undefined,
            thumbnailUrl,
            sourceUrl: `https://www.amap.com/search?query=${encodeURIComponent(poi.name)}&city=${encodeURIComponent(poi.cityname)}`,
            description: description || undefined,
            source: 'amap' as const,
          } satisfies Place;
        })
        .filter((p): p is Place => p !== null);

      if (places.length > 0) return places;
    } catch (e) {
      lastError = String(e);
    }
  }

  if (lastError) {
    throw new Error(lastError);
  }
  return [];
}

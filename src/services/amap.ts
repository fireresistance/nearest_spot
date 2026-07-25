import type { Place, PlaceCategory } from '../types/place';
import { t } from '../i18n';

const AMAP_API_URL = 'https://restapi.amap.com/v3/place/around';
const FETCH_TIMEOUT_MS = 12000;

const SCENIC_TYPES = '110000|140100|140200|140400|140600';
const PAGE_SIZE = 25;

type AmapPoi = {
  id: string;
  name: string;
  type: string;
  typecode?: string;
  location: string;
  address: string;
  pname: string;
  cityname: string;
  adname: string;
  distance: string;
  tel: string;
  photos?: string | Array<{ url?: string }>;
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
        'User-Agent': 'NearestSpot/1.4 (Android; https://github.com/nearestspot)',
        'Accept': 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parsePhotos(photos: AmapPoi['photos']): string | undefined {
  if (!photos) return undefined;
  if (Array.isArray(photos)) {
    const url = photos[0]?.url;
    return url || undefined;
  }
  try {
    const parsed = JSON.parse(photos) as Array<{ url: string }>;
    if (parsed.length > 0 && parsed[0].url) {
      return parsed[0].url;
    }
  } catch {
    const match = photos.match(/"url"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }
  return undefined;
}

function categoryFromTypecode(typecode: string | undefined): PlaceCategory {
  if (!typecode) return 'other';
  const code = typecode.split('|')[0];
  if (/^14(01|02|04|06)/.test(code)) return 'museum';
  if (/^1101/.test(code)) return 'park';
  if (/^11020[567]/.test(code)) return 'worship';
  if (code === '110204') return 'monument';
  if (/^1102/.test(code)) return 'historic';
  return 'other';
}

export type AmapPage = {
  places: Place[];
  hasMore: boolean;
};

export async function fetchNearbyPlacesAmap(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  amapKey: string;
  requireImage: boolean;
  page?: number;
}): Promise<AmapPage> {
  if (!params.amapKey) {
    throw new Error(t('error_amap_key'));
  }

  const radiusMeters = Math.min(500000, Math.max(100, Math.round(params.radiusMeters)));
  const page = params.page ?? 1;

  const url = new URL(AMAP_API_URL);
  url.searchParams.set('key', params.amapKey);
  url.searchParams.set('location', `${params.lon},${params.lat}`);
  url.searchParams.set('radius', String(radiusMeters));
  url.searchParams.set('types', SCENIC_TYPES);
  url.searchParams.set('sortrule', 'distance');
  url.searchParams.set('offset', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('extensions', 'all');

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Amap HTTP ${res.status}`);
  }

  const data = (await res.json()) as AmapAroundResponse;
  if (data.status !== '1') {
    throw new Error(`Amap: ${data.info}`);
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

      const description = [poi.address, poi.type?.split(';').filter(Boolean).slice(1).join(' · ') ?? '']
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
        category: categoryFromTypecode(poi.typecode),
        score: thumbnailUrl ? 10 : 0,
      } satisfies Place;
    })
    .filter((p): p is Place => p !== null);

  const total = parseInt(data.count ?? '0', 10);
  const hasMore = pois.length >= PAGE_SIZE && page * PAGE_SIZE < total;

  return { places, hasMore };
}

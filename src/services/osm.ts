import type { Place } from '../types/place';
import { isBoring } from './wikipedia';

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
const OVERPASS_TIMEOUT_S = 20;

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

const FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(lat: number, lon: number, radiusMeters: number, limit: number): string {
  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];(node["tourism"~"attraction|museum|artwork|gallery|viewpoint|castle|ruins"](around:${radiusMeters},${lat},${lon});node["historic"~"monument|memorial|castle|ruins|archaeological_site|heritage_site"](around:${radiusMeters},${lat},${lon});node["amenity"~"theatre|cinema|library|place_of_worship"](around:${radiusMeters},${lat},${lon});node["leisure"~"park|garden|nature_reserve"](around:${radiusMeters},${lat},${lon}););out body ${limit};`;
}

function getThumbnailUrl(tags: Record<string, string>): string | undefined {
  const image = tags['image'];
  if (image) {
    if (image.startsWith('http')) return image;
  }
  const mapillary = tags.mapillary;
  if (mapillary) {
    return `https://images.mapillary.com/${mapillary}/thumb-640.jpg`;
  }
  const wikimediaCommons = tags.wikimedia_commons ?? tags['wikimedia_commons:file'];
  if (wikimediaCommons && !wikimediaCommons.startsWith('Category:')) {
    const filename = wikimediaCommons.startsWith('File:') ? wikimediaCommons.slice(5) : wikimediaCommons;
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=600`;
  }
  return undefined;
}

export async function fetchNearbyPlacesOSM(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  limit: number;
}): Promise<Place[]> {
  const maxApiRadius = 10000;
  const requestedRadius = Math.max(10, Math.round(params.radiusMeters));

  if (requestedRadius <= maxApiRadius) {
    return fetchNearbyPlacesOSMSingle(params, requestedRadius);
  }

  const { generateCoverPoints } = await import('./coverGrid');
  const points = generateCoverPoints(params.lat, params.lon, requestedRadius, maxApiRadius);
  console.log(`[OSM] Multi-query: ${requestedRadius}m radius → ${points.length} sub-queries`);

  const allPlaces: Place[] = [];
  const seenIds = new Set<string>();

  const batchSize = 2;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((pt) =>
        fetchNearbyPlacesOSMSingle(
          { ...params, lat: pt.lat, lon: pt.lon },
          maxApiRadius,
        ),
      ),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const p of r.value) {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            allPlaces.push(p);
          }
        }
      }
    }
    if (allPlaces.length >= params.limit * 2) break;
  }

  console.log(`[OSM] Multi-query total: ${allPlaces.length} places`);
  return allPlaces.slice(0, params.limit);
}

async function fetchNearbyPlacesOSMSingle(
  params: {
    lat: number;
    lon: number;
    radiusMeters: number;
    limit: number;
  },
  apiRadius: number,
): Promise<Place[]> {
  const query = buildQuery(params.lat, params.lon, apiRadius, params.limit);
  const body = `data=${encodeURIComponent(query)}`;

  let lastError: string | null = null;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NearestSpot/1.2 (Android; https://github.com/nearestspot)',
        },
        body,
      });

      if (!res.ok) {
        lastError = `Overpass ${res.status}`;
        continue;
      }

      const data = (await res.json()) as { elements?: OverpassElement[] };
      const elements = data.elements ?? [];

      return elements
        .filter((e) => e.tags?.name && !isBoring(e.tags.name))
        .map<Place>((e) => {
          const name = e.tags!.name ?? '';
          const nameEn = e.tags!['name:en'] ?? '';
          const description =
            e.tags!.description ?? e.tags!['description:en'] ?? e.tags!.wikipedia ?? '';
          const osmUrl = `https://www.openstreetmap.org/${e.type}/${e.id}`;
          const thumbnailUrl = getThumbnailUrl(e.tags!);
          return {
            id: `osm:${e.type}/${e.id}`,
            title: nameEn && nameEn !== name ? `${name} (${nameEn})` : name,
            lat: e.lat,
            lon: e.lon,
            thumbnailUrl,
            sourceUrl: osmUrl,
            description: description || undefined,
            source: 'osm' as const,
          };
        })
        .slice(0, params.limit);
    } catch (e) {
      lastError = String(e);
    }
  }

  throw new Error(lastError ?? 'Overpass API недоступна');
}

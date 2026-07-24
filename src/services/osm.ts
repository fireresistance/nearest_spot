import type { Place, PlaceCategory } from '../types/place';
import { isBoring } from './wikipedia';

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
const OVERPASS_TIMEOUT_S = 25;

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

function scoreOSMElement(tags: Record<string, string>): number {
  let score = 0;

  if (tags.tourism === 'attraction') score += 30;
  else if (tags.tourism === 'museum') score += 28;
  else if (tags.tourism === 'castle' || tags.tourism === 'ruins') score += 25;
  else if (tags.tourism === 'artwork' || tags.tourism === 'gallery') score += 20;
  else if (tags.tourism === 'viewpoint') score += 15;

  if (tags.historic === 'castle' || tags.historic === 'ruins') score += 25;
  else if (tags.historic === 'archaeological_site' || tags.historic === 'heritage_site') score += 22;
  else if (tags.historic === 'monument') score += 18;
  else if (tags.historic === 'memorial') score += 10;

  if (tags.amenity === 'theatre') score += 22;
  else if (tags.amenity === 'cinema') score += 15;
  else if (tags.amenity === 'library') score += 12;
  else if (tags.amenity === 'place_of_worship') score += 14;

  if (tags.leisure === 'nature_reserve') score += 20;
  else if (tags.leisure === 'garden') score += 16;
  else if (tags.leisure === 'park') score += 12;

  if (tags.wikipedia) score += 8;
  if (tags.wikidata) score += 5;
  if (tags.image || tags.wikimedia_commons || tags.mapillary) score += 10;
  if (tags.description || tags['description:en']) score += 4;
  if (tags['name:en']) score += 3;
  if (tags.website) score += 3;
  if (tags.heritage) score += 6;
  if (tags['heritage:operator'] === 'UNESCO') score += 15;

  return score;
}

function categoryFromTags(tags: Record<string, string>): PlaceCategory {
  if (tags.tourism === 'museum' || tags.tourism === 'gallery' || tags.amenity === 'library' || tags.amenity === 'theatre' || tags.amenity === 'cinema') return 'museum';
  if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'nature_reserve') return 'park';
  if (tags.amenity === 'place_of_worship') return 'worship';
  if (tags.historic === 'monument' || tags.historic === 'memorial') return 'monument';
  if (tags.historic) return 'historic';
  return 'other';
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
          const description = e.tags!.description ?? e.tags!['description:en'];
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
            category: categoryFromTags(e.tags!),
            score: scoreOSMElement(e.tags!),
          };
        })
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, params.limit);
    } catch (e) {
      lastError = String(e);
    }
  }

  throw new Error(lastError ?? 'Overpass API недоступна');
}

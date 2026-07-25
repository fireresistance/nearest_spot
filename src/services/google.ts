import type { Place, PlaceCategory } from '../types/place';
import { t } from '../i18n';

const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const PHOTO_API_URL = 'https://maps.googleapis.com/maps/api/place/photo';
const FETCH_TIMEOUT_MS = 10000;

const BORING_TYPES = new Set([
  'subway_station', 'bus_station', 'train_station', 'transit_station', 'parking',
  'gas_station', 'atm', 'bank', 'hospital', 'pharmacy', 'school', 'doctor',
  'dentist', 'veterinary_care', 'local_government_office', 'post_office',
  'convenience_store', 'supermarket', 'grocery_or_supermarket', 'store',
  'laundry', 'car_wash', 'car_repair', 'car_dealer', 'lodging',
]);

type NearbyResult = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  types?: string[];
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
  vicinity?: string;
  rating?: number;
  icon?: string;
};

type NearbyResponse = {
  results: NearbyResult[];
  status: string;
  next_page_token?: string;
  error_message?: string;
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

function categoryFromTypes(types: string[] | undefined): PlaceCategory {
  if (!types) return 'other';
  if (types.includes('museum') || types.includes('art_gallery')) return 'museum';
  if (types.includes('park') || types.includes('zoo') || types.includes('aquarium')) return 'park';
  if (types.includes('church') || types.includes('mosque') || types.includes('synagogue') || types.includes('hindu_temple')) return 'worship';
  return 'other';
}

export type GooglePage = {
  places: Place[];
  nextPageToken?: string;
};

export async function fetchNearbyPlacesGoogle(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  googleKey: string;
  requireImage: boolean;
  pageToken?: string;
}): Promise<GooglePage> {
  if (!params.googleKey) throw new Error(t('error_google_key'));

  const url = new URL(PLACES_API_URL);
  url.searchParams.set('key', params.googleKey);

  if (params.pageToken) {
    url.searchParams.set('pagetoken', params.pageToken);
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    const radiusMeters = Math.min(500000, Math.max(100, Math.round(params.radiusMeters)));
    url.searchParams.set('location', `${params.lat},${params.lon}`);
    url.searchParams.set('radius', String(radiusMeters));
    url.searchParams.set('type', 'tourist_attraction');
    url.searchParams.set('language', 'ru');
  }

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const data = (await res.json()) as NearbyResponse;

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places: ${data.status} ${data.error_message ?? ''}`);
  }

  const results = (data.results ?? []).filter((r) => {
    if (!r.types || r.types.length === 0) return true;
    return !r.types.some((t) => BORING_TYPES.has(t));
  });

  const places = results
    .map<Place | null>((r) => {
      const thumbnailUrl = r.photos?.[0]
        ? `${PHOTO_API_URL}?maxwidth=600&photoreference=${r.photos[0].photo_reference}&key=${params.googleKey}`
        : undefined;

      if (params.requireImage && !thumbnailUrl) return null;

      return {
        id: `google:${r.place_id}`,
        title: r.name,
        lat: r.geometry.location.lat,
        lon: r.geometry.location.lng,
        distanceMeters: undefined,
        thumbnailUrl,
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
        description: r.vicinity || undefined,
        source: 'google' as const,
        category: categoryFromTypes(r.types),
        score: r.rating !== undefined ? Math.round(r.rating * 2) : 0,
      } satisfies Place;
    })
    .filter((p): p is Place => p !== null);

  return { places, nextPageToken: data.next_page_token };
}

export async function searchGooglePhoto(params: {
  title: string;
  lat: number;
  lon: number;
  googleKey: string;
}): Promise<string | undefined> {
  if (!params.googleKey) return undefined;

  const url = new URL(PLACES_API_URL);
  url.searchParams.set('key', params.googleKey);
  url.searchParams.set('location', `${params.lat},${params.lon}`);
  url.searchParams.set('radius', '5000');
  url.searchParams.set('name', params.title);
  url.searchParams.set('language', 'ru');

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) return undefined;
    const data = (await res.json()) as NearbyResponse;
    if (data.status !== 'OK' || !data.results?.[0]?.photos?.[0]) return undefined;
    return `${PHOTO_API_URL}?maxwidth=600&photoreference=${data.results[0].photos[0].photo_reference}&key=${params.googleKey}`;
  } catch {
    return undefined;
  }
}

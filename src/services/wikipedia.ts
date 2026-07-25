import type { Place } from '../types/place';

type WikiQueryResponse<T> = {
  query?: T;
  error?: { code: string; info: string };
};

const WIKI_LANGS = ['en', 'ru', 'zh', 'ja', 'fr', 'de', 'es', 'pt', 'ko', 'it'] as const;
export type WikiLang = (typeof WIKI_LANGS)[number] | 'auto';

export const WIKI_LANG_OPTIONS: { value: WikiLang; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ko', label: '한국어' },
  { value: 'it', label: 'Italiano' },
];

const FETCH_TIMEOUT_MS = 15000;
const MAX_FALLBACK_LANGS = 3;

const WIKI_HOSTS = [
  (lang: string) => `https://${lang}.wikipedia.org`,
  (lang: string) => `https://${lang}.m.wikipedia.org`,
];

export const BORING_PATTERNS = [
  // Transit: metro/subway
  /метро/i, /metro/i, /subway/i, /станция метро/i, /地铁站/i, /метростанция/i,
  /subway entrance/i, /вход в метро/i,
  // Transit: bus/tram/trolleybus stops
  /bus stop/i, /автобусн/i, /остановк/i, /公交站/i,
  /трамвайн/i, /tram stop/i, /трамвайная остановка/i,
  /троллейбус/i, /trolleybus/i,
  /маршрутк/i,
  // Transit: stations and platforms (railway etc.)
  /\bstation\b/i, /станция\b/i, /车站/i,
  /вокзал/i, /railway station/i, /train station/i,
  /платформа\b/i, /перрон/i,
  /железнодорожн.*остановк/i,
  // Parking
  /parking/i, /парковк/i, /停车场/i, /стоянк/i,
  // Gas/fuel
  /gas station/i, /заправк/i, /加油站/i, /азс\b/i, /бензоколонк/i,
  // ATM/finance
  /\batm\b/i, /банкомат/i, /банк\b/i, /银行/i,
  // Healthcare
  /hospital/i, /больниц/i, /医院/i, /clinic/i, /клиник/i,
  /pharmacy/i, /аптек/i, /药店/i,
  // Retail/services
  /supermarket/i, /супермаркет/i, /超市/i,
  /convenience store/i, /便利店/i,
  /магазин/i, /торговый центр/i, /торгов.*центр/i,
  // Sanitation
  /toilet/i, /туалет/i, /厕所/i,
  // Mail
  /post office/i, /почтовое отделение/i, /邮局/i,
  // Education
  /school/i, /школ/i, /学校/i, /kindergarten/i, /детский сад/i,
  /детсад/i, /общеобразовательн/i,
  // Residential/industrial/office
  /residential/i, /жилой дом/i,
  /\boffice\b/i, /офисный/i, /办公楼/i, /бизнес.?центр/i,
  /industrial/i, /промышленн/i, /производств/i,
  /warehouse/i, /склад\b/i,
];

export function isBoring(title: string): boolean {
  return BORING_PATTERNS.some((p) => p.test(title));
}

function resolveLang(lang: WikiLang): string {
  if (lang !== 'auto') return lang;
  try {
    const locale =
      typeof navigator !== 'undefined' && navigator.languages?.[0]
        ? navigator.languages[0]
        : typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().locale
          : 'en';
    const primary = locale.split('-')[0].toLowerCase();
    if ((WIKI_LANGS as readonly string[]).includes(primary)) return primary;
  } catch {
    // fallback
  }
  return 'en';
}

function buildApiUrl(host: string, params: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  parts.push('format=json');
  return `${host}/w/api.php?${parts.join('&')}`;
}

function xhrGet(url: string, timeout: number = FETCH_TIMEOUT_MS): Promise<{ status: number; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = timeout;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
    xhr.setRequestHeader('User-Agent', 'NearestSpot/1.5.0 (Android; https://github.com/nearestspot)');
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        body: xhr.responseText,
        contentType: xhr.getResponseHeader('content-type') ?? '',
      });
    };
    xhr.onerror = () => reject(new Error(`XHR network error`));
    xhr.ontimeout = () => reject(new Error(`XHR timeout`));
    xhr.send();
  });
}

async function apiQuery<T>(url: string): Promise<T> {
  const result = await xhrGet(url);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Wikipedia HTTP ${result.status}`);
  }
  return JSON.parse(result.body) as T;
}

type GeneratedPage = {
  pageid: number;
  title: string;
  ns: number;
  coordinates?: Array<{ lat: number; lon: number; dist: number }>;
  thumbnail?: { source: string; width: number; height: number };
  extract?: string;
  fullurl?: string;
};

export async function fetchNearbyPlaces(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  limit: number;
  requireImage: boolean;
  wikiLang: WikiLang;
}): Promise<Place[]> {
  const maxApiRadius = 10000;
  const requestedRadius = Math.max(100, Math.round(params.radiusMeters));

  if (requestedRadius <= maxApiRadius) {
    return fetchNearbyPlacesSingle(params, requestedRadius);
  }

  const { generateCoverPoints } = await import('./coverGrid');
  const points = generateCoverPoints(params.lat, params.lon, requestedRadius, maxApiRadius);

  const allPlaces: Place[] = [];
  const seenIds = new Set<string>();

  const batchSize = 3;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((pt) =>
        fetchNearbyPlacesSingle(
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

  allPlaces.sort((a, b) => {
    const aImg = a.thumbnailUrl ? 0 : 1;
    const bImg = b.thumbnailUrl ? 0 : 1;
    if (aImg !== bImg) return aImg - bImg;
    return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
  });

  return allPlaces.slice(0, params.limit);
}

async function fetchNearbyPlacesSingle(
  params: {
    lat: number;
    lon: number;
    radiusMeters: number;
    limit: number;
    requireImage: boolean;
    wikiLang: WikiLang;
  },
  apiRadius: number,
): Promise<Place[]> {
  const primaryLang = resolveLang(params.wikiLang);
  const langsToTry = [primaryLang];
  for (const l of WIKI_LANGS) {
    if (l !== primaryLang) langsToTry.push(l);
    if (langsToTry.length >= MAX_FALLBACK_LANGS) break;
  }

  let lastError: string | null = null;
  for (const lang of langsToTry) {
    for (const hostFn of WIKI_HOSTS) {
      const host = hostFn(lang);
      try {
        console.log('[wiki] try', host);
        const t0 = Date.now();
        const places = await fetchFromHost(host, lang, params, apiRadius);
        console.log('[wiki] ok', host, places.length, Date.now() - t0, 'ms');
        if (places.length > 0) return places;
      } catch (e) {
        console.log('[wiki] fail', host, String(e));
        lastError = String(e);
      }
    }
  }

  if (lastError) throw new Error(lastError);
  return [];
}

async function fetchFromHost(
  host: string,
  lang: string,
  params: { lat: number; lon: number; limit: number; requireImage: boolean },
  radiusMeters: number,
): Promise<Place[]> {
  const url = buildApiUrl(host, {
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${params.lat}|${params.lon}`,
    ggsradius: radiusMeters,
    ggslimit: 50,
    prop: 'pageimages|extracts|info|coordinates',
    piprop: 'thumbnail',
    pithumbsize: 500,
    inprop: 'url',
    exintro: 1,
    explaintext: 1,
    exsentences: 2,
    colimit: 50,
  });

  const json = await apiQuery<
    WikiQueryResponse<{
      pages?: Record<string, GeneratedPage>;
      geosearch?: Array<{ pageid: number; title: string; lat: number; lon: number; dist: number }>;
    }>
  >(url);

  if (json.error) {
    throw new Error(json.error.info ?? 'Wikipedia error');
  }

  const pages = json.query?.pages ?? {};
  const places: Place[] = [];

  for (const [, page] of Object.entries(pages)) {
    if (isBoring(page.title)) continue;

    const coords = page.coordinates?.[0];
    const lat = coords?.lat ?? 0;
    const lon = coords?.lon ?? 0;
    const dist = coords?.dist;
    const rawThumb = page.thumbnail?.source;
    // Skip thumbnails for category pages (Category: in the path is not a real file).
    const thumbnailUrl =
      rawThumb && !rawThumb.toLowerCase().includes('category%3a') && !rawThumb.includes('/Category:')
        ? rawThumb
        : undefined;

    if (params.requireImage && !thumbnailUrl) continue;
    if (lat === 0 && lon === 0) continue;

    places.push({
      id: `${lang}:${page.pageid}`,
      title: page.title,
      lat,
      lon,
      distanceMeters: dist,
      thumbnailUrl,
      sourceUrl: page.fullurl,
      description: page.extract?.trim(),
      source: 'wikipedia',
      score: (thumbnailUrl ? 20 : 0) + (page.extract?.trim() ? 5 : 0),
    });
  }

  places.sort((a, b) => {
    const aImg = a.thumbnailUrl ? 0 : 1;
    const bImg = b.thumbnailUrl ? 0 : 1;
    if (aImg !== bImg) return aImg - bImg;
    return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
  });
  return places.slice(0, params.limit);
}

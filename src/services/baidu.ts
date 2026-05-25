const BAIKE_API_URL = 'https://baike.baidu.com/api/openapi/BaikeLemmaCardApi';
const FETCH_TIMEOUT_MS = 8000;

export type BaikeResult = {
  title: string;
  description: string;
  imageUrl: string | undefined;
  url: string | undefined;
};

type BaikeApiResponse = {
  key?: string;
  title?: string;
  abstract?: string;
  image?: string;
  url?: string;
  error?: string;
  errorCode?: number;
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

export async function searchBaike(keyword: string): Promise<BaikeResult | null> {
  const url = new URL(BAIKE_API_URL);
  url.searchParams.set('scope', '110');
  url.searchParams.set('format', 'json');
  url.searchParams.set('appid', '379020');
  url.searchParams.set('bk_key', keyword);
  url.searchParams.set('bk_length', '600');

  console.log('[BAIKE] search:', keyword);

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) {
      console.log('[BAIKE] HTTP error:', res.status);
      return null;
    }

    const ct = res.headers?.get?.('content-type') ?? '';
    if (!ct.includes('json') && !ct.includes('text/javascript') && !ct.includes('text/html')) {
      console.log('[BAIKE] unexpected ct:', ct);
      return null;
    }

    const text = await res.text();
    let data: BaikeApiResponse;
    try {
      data = JSON.parse(text) as BaikeApiResponse;
    } catch {
      console.log('[BAIKE] JSON parse error');
      return null;
    }

    if (data.error || !data.title) {
      console.log('[BAIKE] no result for:', keyword, data.error);
      return null;
    }

    return {
      title: data.title ?? keyword,
      description: data.abstract?.trim() ?? '',
      imageUrl: data.image || undefined,
      url: data.url || undefined,
    };
  } catch (e) {
    console.log('[BAIKE] fetch error:', String(e));
    return null;
  }
}

export async function enrichPlaceWithBaike(place: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
}): Promise<{
  description?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
}> {
  const baike = await searchBaike(place.title);
  if (!baike) return {};

  return {
    description: place.description || baike.description || undefined,
    thumbnailUrl: place.thumbnailUrl || baike.imageUrl || undefined,
    sourceUrl: baike.url || place.sourceUrl,
  };
}

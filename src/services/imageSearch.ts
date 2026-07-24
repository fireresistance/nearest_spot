import { searchBaikeImage, hasChineseChars } from './baiduImage';

const FETCH_TIMEOUT_MS = 8000;

function xhrGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = FETCH_TIMEOUT_MS;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('XHR error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout'));
    xhr.send();
  });
}

export async function searchWikimediaCommons(title: string): Promise<string | undefined> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(title)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json`;

  try {
    const result = await xhrGet(url);
    if (result.status !== 200) return undefined;

    const json = JSON.parse(result.body);
    const pages = json?.query?.pages;
    if (!pages) return undefined;

    for (const page of Object.values(pages) as Array<{ imageinfo?: Array<{ thumburl?: string; url?: string }> }>) {
      const thumb = page.imageinfo?.[0]?.thumburl;
      if (thumb && thumb.startsWith('https://upload.wikimedia.org/')) {
        return thumb;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function searchWikipediaThumbnail(title: string): Promise<string | undefined> {
  const langs = ['ru', 'en'];
  for (const lang of langs) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json`;
      const result = await xhrGet(url);
      if (result.status !== 200) continue;

      const json = JSON.parse(result.body);
      const pages = json?.query?.pages;
      if (!pages) continue;

      for (const page of Object.values(pages) as Array<{ thumbnail?: { source?: string } }>) {
        const src = page.thumbnail?.source;
        if (src) return src;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

export async function searchOpenverse(title: string): Promise<string | undefined> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(title)}&page_size=5&mature=false`;

  try {
    const result = await xhrGet(url);
    if (result.status !== 200) return undefined;

    const json = JSON.parse(result.body);
    const results = json?.results;
    if (!Array.isArray(results) || results.length === 0) return undefined;

    for (const r of results as Array<{ url?: string; thumbnail?: string; provider?: string }>) {
      if (r.url && !r.url.includes('api.openverse.org')) {
        return r.url;
      }
    }

    const hit = results.find(
      (r: { url?: string; thumbnail?: string }) => r.thumbnail || r.url,
    );
    return hit?.url || hit?.thumbnail || undefined;
  } catch {
    return undefined;
  }
}

export async function searchImageFallback(title: string): Promise<string | undefined> {
  if (hasChineseChars(title)) {
    const baikeImg = await searchBaikeImage(title);
    if (baikeImg) return baikeImg;
  }

  const wikiThumb = await searchWikipediaThumbnail(title);
  if (wikiThumb) return wikiThumb;

  const wikiResult = await searchWikimediaCommons(title);
  if (wikiResult) return wikiResult;

  const openverseResult = await searchOpenverse(title);
  if (openverseResult) return openverseResult;

  return undefined;
}

export async function enrichPlacesWithFallbackImages(
  places: Array<{ id: string; title: string; thumbnailUrl?: string }>,
  maxPlaces: number = 8,
): Promise<Map<string, string>> {
  const withoutImage = places.filter((p) => !p.thumbnailUrl);
  if (withoutImage.length === 0) return new Map();

  const results = await Promise.allSettled(
    withoutImage.slice(0, maxPlaces).map(async (p) => {
      const url = await searchImageFallback(p.title);
      return { id: p.id, url };
    }),
  );

  const map = new Map<string, string>();
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.url) {
      map.set(r.value.id, r.value.url);
    }
  }
  return map;
}

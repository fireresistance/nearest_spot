const BAIKE_ITEM_URL = 'https://baike.baidu.com/item/';
const FETCH_TIMEOUT_MS = 10000;

function xhrGet(url: string): Promise<{ status: number; body: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = FETCH_TIMEOUT_MS;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    xhr.setRequestHeader('Referer', 'https://baike.baidu.com/');
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText, finalUrl: xhr.responseURL });
    xhr.onerror = () => reject(new Error('XHR error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout'));
    xhr.send();
  });
}

export function hasChineseChars(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

function cleanChineseKeyword(title: string): string {
  let cleaned = title.replace(/\s*[\(（][^)）]*[)）]\s*/g, '');
  cleaned = cleaned.replace(/[\(（].+$/, '');
  const chinesePart = cleaned.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g);
  if (chinesePart && chinesePart.length > 0) {
    return chinesePart.join('');
  }
  return cleaned.trim();
}

function extractBkimgUrls(html: string): string[] {
  const urls: string[] = [];

  const picMatches = html.match(/https?:\/\/bkimg\.cdn\.bcebos\.com\/pic\/[^\s"'<>]+/g);
  if (picMatches) {
    for (const u of picMatches) {
      const clean = u.replace(/&amp;/g, '&');
      if (!urls.includes(clean)) urls.push(clean);
    }
  }

  const smartMatches = html.match(/https?:\/\/bkimg\.cdn\.bcebos\.com\/smart\/[^\s"'<>]+/g);
  if (smartMatches) {
    for (const u of smartMatches) {
      const clean = u.replace(/&amp;/g, '&');
      if (!urls.includes(clean)) urls.push(clean);
    }
  }

  return urls;
}

function resizeBkimgUrl(url: string, width: number): string {
  if (url.includes('/smart/')) {
    if (url.includes('x-bce-process=')) {
      return url;
    }
    return url + '?x-bce-process=image/resize,m_lfit,w_' + width + ',limit_0/quality,Q_80';
  }

  if (url.includes('/pic/')) {
    const hash = url.match(/\/pic\/([a-f0-9]+)/)?.[1];
    if (hash) {
      return 'https://bkimg.cdn.bcebos.com/pic/' + hash + '?x-bce-process=image/resize,m_lfit,w_' + width + ',limit_0/quality,Q_80';
    }
  }

  return url;
}

export async function searchBaikeImage(keyword: string): Promise<string | undefined> {
  const cleaned = cleanChineseKeyword(keyword);
  const url = BAIKE_ITEM_URL + encodeURIComponent(cleaned);

  console.log('[BAIKE_IMG] search:', keyword, '-> cleaned:', cleaned);

  try {
    const result = await xhrGet(url);
    if (result.status !== 200) {
      console.log('[BAIKE_IMG] HTTP error:', result.status);
      return undefined;
    }

    const html = result.body;
    if (!html || html.length < 1000) {
      console.log('[BAIKE_IMG] empty page for:', keyword);
      return undefined;
    }

    const urls = extractBkimgUrls(html);
    if (urls.length === 0) {
      console.log('[BAIKE_IMG] no bkimg URLs for:', keyword);
      return undefined;
    }

    const best = urls[0];
    const resized = resizeBkimgUrl(best, 600);

    console.log('[BAIKE_IMG] found:', keyword, resized.substring(0, 100));
    return resized;
  } catch (e) {
    console.log('[BAIKE_IMG] error:', String(e));
    return undefined;
  }
}

export async function searchBaiduImage(keyword: string): Promise<string | undefined> {
  return searchBaikeImage(keyword);
}

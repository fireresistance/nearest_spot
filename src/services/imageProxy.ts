export function proxyImageUrl(url: string | undefined, region: string): string | undefined {
  if (!url) return undefined;

  if (region === 'china') {
    if (url.includes('upload.wikimedia.org') || url.includes('commons.wikimedia.org')) {
      const filename = extractWikimediaFilename(url);
      if (filename) {
        return `https://zh.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=600`;
      }
    }

    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
  }

  return url;
}

function extractWikimediaFilename(url: string): string | undefined {
  let match = url.match(/\/wiki\/Special:FilePath\/([^?]+)/);
  if (match) return decodeURIComponent(match[1]);

  match = url.match(/\/thumb\/(.+?\/[^/]+)\/\d+px-/);
  if (match) return decodeURIComponent(match[1].split('/').pop() ?? '');

  match = url.match(/\/(?:commons|wikipedia)\/[^/]+\/thumb\/(.+?\/[^/]+)\//);
  if (match) return decodeURIComponent(match[1].split('/').pop() ?? '');

  match = url.match(/\/([^/]+\.(?:jpg|jpeg|png|gif|svg|webp))(?:\?|$)/i);
  if (match) return decodeURIComponent(match[1]);

  return undefined;
}

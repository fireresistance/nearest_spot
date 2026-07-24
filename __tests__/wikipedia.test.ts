import { fetchNearbyPlaces, isBoring } from '../src/services/wikipedia';

function mockGeosearch(pages: Record<string, unknown>) {
  (global.fetch as unknown as jest.Mock).mockImplementation(async (input: unknown) => {
    const url = String(typeof input === 'string' ? input : (input as { url?: string })?.url ?? input);
    if (url.includes('generator=geosearch')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ query: { pages } }),
      };
    }
    throw new Error(`Unexpected URL in fetch mock: ${url}`);
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('isBoring filters transit and mundane places', () => {
  expect(isBoring('Станция метро Автово')).toBe(true);
  expect(isBoring('Bus stop 5th avenue')).toBe(true);
  expect(isBoring('Парковка у торгового центра')).toBe(true);
  expect(isBoring('Эрмитаж')).toBe(false);
  expect(isBoring('Red Square')).toBe(false);
});

test('fetchNearbyPlaces returns places and filters without images when requireImage=true', async () => {
  mockGeosearch({
    '1': {
      pageid: 1,
      title: 'Place A',
      ns: 0,
      coordinates: [{ lat: 10, lon: 10, dist: 200 }],
      fullurl: 'https://example.com/a',
      extract: 'A desc',
    },
    '2': {
      pageid: 2,
      title: 'Place B',
      ns: 0,
      coordinates: [{ lat: 11, lon: 11, dist: 100 }],
      fullurl: 'https://example.com/b',
      extract: 'B desc',
      thumbnail: { source: 'https://example.com/b.jpg', width: 100, height: 100 },
    },
  });

  const places = await fetchNearbyPlaces({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
    requireImage: true,
    wikiLang: 'en',
  });

  expect(places).toHaveLength(1);
  expect(places[0].id).toBe('en:2');
  expect(places[0].thumbnailUrl).toBeTruthy();
});

test('fetchNearbyPlaces includes entries without images when requireImage=false', async () => {
  mockGeosearch({
    '1': {
      pageid: 1,
      title: 'Place A',
      ns: 0,
      coordinates: [{ lat: 10, lon: 10, dist: 200 }],
      fullurl: 'https://example.com/a',
      extract: 'A desc',
    },
  });

  const places = await fetchNearbyPlaces({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
    requireImage: false,
    wikiLang: 'en',
  });

  expect(places).toHaveLength(1);
  expect(places[0].id).toBe('en:1');
});

test('fetchNearbyPlaces filters boring places', async () => {
  mockGeosearch({
    '1': {
      pageid: 1,
      title: 'Bus stop Central',
      ns: 0,
      coordinates: [{ lat: 10, lon: 10, dist: 100 }],
    },
    '2': {
      pageid: 2,
      title: 'City Museum',
      ns: 0,
      coordinates: [{ lat: 10, lon: 10, dist: 150 }],
    },
  });

  const places = await fetchNearbyPlaces({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
    requireImage: false,
    wikiLang: 'en',
  });

  expect(places).toHaveLength(1);
  expect(places[0].title).toBe('City Museum');
});

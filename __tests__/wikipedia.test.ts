import { buildMapsDirectionsUrl, fetchNearbyPlaces } from '../src/services/wikipedia';

function mockFetchOnce(json: unknown, ok = true) {
  (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => json,
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('buildMapsDirectionsUrl sets travel mode', () => {
  const url = buildMapsDirectionsUrl({ destination: { lat: 1, lon: 2 }, travelMode: 'walk' });
  expect(url).toContain('destination=1,2');
  expect(url).toContain('travelmode=walking');
});

test('fetchNearbyPlaces returns sorted places and filters without images when requireImage=true', async () => {
  mockFetchOnce({
    query: {
      geosearch: [
        { pageid: 1, title: 'A', lat: 10, lon: 10, dist: 200 },
        { pageid: 2, title: 'B', lat: 11, lon: 11, dist: 100 },
      ],
    },
  });

  mockFetchOnce({
    query: {
      pages: {
        '1': {
          pageid: 1,
          title: 'A',
          fullurl: 'https://example.com/a',
          extract: 'A desc',
        },
        '2': {
          pageid: 2,
          title: 'B',
          fullurl: 'https://example.com/b',
          extract: 'B desc',
          thumbnail: { source: 'https://example.com/b.jpg', width: 100, height: 100 },
        },
      },
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
  mockFetchOnce({
    query: {
      geosearch: [{ pageid: 1, title: 'A', lat: 10, lon: 10, dist: 200 }],
    },
  });

  mockFetchOnce({
    query: {
      pages: {
        '1': {
          pageid: 1,
          title: 'A',
          fullurl: 'https://example.com/a',
          extract: 'A desc',
        },
      },
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


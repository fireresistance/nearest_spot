import { fetchNearbyPlacesOSM } from '../src/services/osm';

function mockFetchOnce(json: unknown, ok = true, status = 200) {
  (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
    ok,
    status: ok ? status : status,
    json: async () => json,
    headers: new Map([['content-type', 'application/json']]),
  });
}

function mockFetchError(status: number) {
  (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({}),
    headers: new Map([['content-type', 'text/html']]),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('fetchNearbyPlacesOSM returns places with image tag as thumbnail', async () => {
  mockFetchOnce({
    elements: [
      {
        type: 'node',
        id: 100,
        lat: 27.96,
        lon: 120.67,
        tags: {
          name: '江心屿',
          'name:en': 'Jiangxin Island',
          tourism: 'attraction',
          image: 'https://example.com/photo.jpg',
          description: 'A scenic island',
        },
      },
    ],
  });

  const places = await fetchNearbyPlacesOSM({
    lat: 27.96,
    lon: 120.67,
    radiusMeters: 5000,
    limit: 10,
  });

  expect(places).toHaveLength(1);
  expect(places[0].id).toBe('osm:node/100');
  expect(places[0].title).toBe('江心屿 (Jiangxin Island)');
  expect(places[0].thumbnailUrl).toBe('https://example.com/photo.jpg');
  expect(places[0].description).toBe('A scenic island');
  expect(places[0].source).toBe('osm');
  expect(places[0].sourceUrl).toBe('https://www.openstreetmap.org/node/100');
});

test('fetchNearbyPlacesOSM uses wikimedia_commons for thumbnail', async () => {
  mockFetchOnce({
    elements: [
      {
        type: 'node',
        id: 200,
        lat: 27.96,
        lon: 120.67,
        tags: {
          name: 'Test Temple',
          amenity: 'place_of_worship',
          wikimedia_commons: 'File:Temple.jpg',
        },
      },
    ],
  });

  const places = await fetchNearbyPlacesOSM({
    lat: 27.96,
    lon: 120.67,
    radiusMeters: 5000,
    limit: 10,
  });

  expect(places).toHaveLength(1);
  expect(places[0].thumbnailUrl).toContain('commons.wikimedia.org');
  expect(places[0].thumbnailUrl).toContain('Temple.jpg');
});

test('fetchNearbyPlacesOSM filters out elements without name', async () => {
  mockFetchOnce({
    elements: [
      { type: 'node', id: 1, lat: 0, lon: 0, tags: { tourism: 'attraction' } },
      { type: 'node', id: 2, lat: 0, lon: 0, tags: { name: 'Named Place', tourism: 'museum' } },
    ],
  });

  const places = await fetchNearbyPlacesOSM({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
  });

  expect(places).toHaveLength(1);
  expect(places[0].title).toBe('Named Place');
});

test('fetchNearbyPlacesOSM falls back to next server on error', async () => {
  mockFetchError(406);
  mockFetchOnce({
    elements: [
      {
        type: 'node',
        id: 300,
        lat: 0,
        lon: 0,
        tags: { name: 'Fallback Place', historic: 'monument' },
      },
    ],
  });

  const places = await fetchNearbyPlacesOSM({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
  });

  expect(places).toHaveLength(1);
  expect(places[0].title).toBe('Fallback Place');
});

test('fetchNearbyPlacesOSM throws when all servers fail', async () => {
  mockFetchError(500);
  mockFetchError(500);
  mockFetchError(500);

  await expect(
    fetchNearbyPlacesOSM({ lat: 0, lon: 0, radiusMeters: 1000, limit: 10 }),
  ).rejects.toThrow();
});

test('fetchNearbyPlacesOSM uses name only when name:en is same', async () => {
  mockFetchOnce({
    elements: [
      {
        type: 'node',
        id: 400,
        lat: 0,
        lon: 0,
        tags: { name: 'Park', 'name:en': 'Park', leisure: 'park' },
      },
    ],
  });

  const places = await fetchNearbyPlacesOSM({
    lat: 0,
    lon: 0,
    radiusMeters: 1000,
    limit: 10,
  });

  expect(places[0].title).toBe('Park');
});

import { fetchNearbyPlaces } from '../src/services/wikipedia';

const shouldRun = process.env.INTEGRATION === '1';

(shouldRun ? test : test.skip)('wikipedia integration: returns places for mock locations', async () => {
  const mocks = [
    { id: 'moscow', lat: 55.7558, lon: 37.6173 },
    { id: 'spb', lat: 59.9343, lon: 30.3351 },
    { id: 'paris', lat: 48.8566, lon: 2.3522 },
  ];

  const results = await Promise.all(
    mocks.map(async (m) => {
      const places = await fetchNearbyPlaces({
        lat: m.lat,
        lon: m.lon,
        radiusMeters: 10000,
        limit: 5,
        requireImage: false,
        wikiLang: 'en',
      });
      return { id: m.id, count: places.length, firstTitle: places[0]?.title };
    }),
  );

  for (const r of results) {
    expect(r.count).toBeGreaterThan(0);
    expect(typeof r.firstTitle).toBe('string');
  }
});

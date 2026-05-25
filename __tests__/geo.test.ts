import { estimateEtaMinutes, formatDistance, formatEtaMinutes, haversineDistanceMeters } from '../src/utils/geo';

test('haversineDistanceMeters: same point is ~0', () => {
  const d = haversineDistanceMeters({ lat: 55.75, lon: 37.61 }, { lat: 55.75, lon: 37.61 });
  expect(d).toBeLessThan(0.001);
});

test('formatDistance', () => {
  expect(formatDistance(12)).toBe('12 м');
  expect(formatDistance(999)).toBe('999 м');
  expect(formatDistance(1000)).toBe('1.0 км');
  expect(formatDistance(10500)).toBe('11 км');
});

test('estimateEtaMinutes + formatEtaMinutes', () => {
  const walk = estimateEtaMinutes(1400, 'walk');
  expect(walk).toBeGreaterThan(0);
  expect(formatEtaMinutes(walk)).toMatch(/мин/);

  expect(formatEtaMinutes(60)).toBe('1 ч');
  expect(formatEtaMinutes(61)).toBe('1 ч 1 мин');
});


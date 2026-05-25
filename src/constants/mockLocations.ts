export type MockLocation = {
  id: string;
  title: string;
  lat: number;
  lon: number;
};

export const MOCK_LOCATIONS: MockLocation[] = [
  { id: 'moscow', title: 'Москва (центр)', lat: 55.7558, lon: 37.6173 },
  { id: 'spb', title: 'СПб (центр)', lat: 59.9343, lon: 30.3351 },
  { id: 'paris', title: 'Paris', lat: 48.8566, lon: 2.3522 },
  { id: 'nyc', title: 'New York', lat: 40.7128, lon: -74.006 },
  { id: 'tokyo', title: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'shanghai', title: 'Шанхай', lat: 31.2304, lon: 121.4737 },
  { id: 'beijing', title: 'Пекин', lat: 39.9042, lon: 116.4074 },
];


export type Region = 'china' | 'russia' | 'japan' | 'europe' | 'americas' | 'other';

export type RegionInfo = {
  region: Region;
  label: string;
  labelLocal: string;
  primaryProviders: string[];
  tip: string;
};

const REGIONS: Record<Region, Omit<RegionInfo, 'region'>> = {
  china: {
    label: 'China',
    labelLocal: '中国',
    primaryProviders: ['Amap', 'Baidu Baike'],
    tip: 'В Китае Amap и Baidu работают стабильнее Wikipedia/OSM. Получи бесплатный ключ на lbs.amap.com',
  },
  russia: {
    label: 'Russia',
    labelLocal: 'Россия',
    primaryProviders: ['Wikipedia', 'OSM'],
    tip: 'Wikipedia и OSM работают в России без ограничений',
  },
  japan: {
    label: 'Japan',
    labelLocal: '日本',
    primaryProviders: ['Wikipedia', 'OSM'],
    tip: 'Wikipedia и OSM хорошо покрывают Японию',
  },
  europe: {
    label: 'Europe',
    labelLocal: 'Europe',
    primaryProviders: ['Wikipedia', 'OSM'],
    tip: 'Wikipedia и OSM отлично работают в Европе',
  },
  americas: {
    label: 'Americas',
    labelLocal: 'Americas',
    primaryProviders: ['Wikipedia', 'OSM'],
    tip: 'Wikipedia и OSM отлично работают в Америке',
  },
  other: {
    label: 'Other',
    labelLocal: '—',
    primaryProviders: ['Wikipedia', 'OSM'],
    tip: 'Wikipedia и OSM — основные источники данных',
  },
};

export function detectRegion(lat: number, lon: number): Region {
  if (lon >= 73 && lon <= 135 && lat >= 18 && lat <= 54) return 'china';
  if (lon >= 19 && lon <= 180 && lat >= 45 && lat <= 50) return 'russia';
  if (lon >= 19 && lon <= 55 && lat >= 50 && lat <= 60) return 'russia';
  if (lon >= 55 && lon <= 180 && lat >= 50 && lat <= 78) return 'russia';
  if (lon >= 129 && lon <= 146 && lat >= 30 && lat <= 46) return 'japan';
  if (lon >= -12 && lon <= 40 && lat >= 35 && lat <= 72) return 'europe';
  if (lon >= -170 && lon <= -30 && lat >= -56 && lat <= 75) return 'americas';
  return 'other';
}

export function getRegionInfo(region: Region): RegionInfo {
  return { ...REGIONS[region], region };
}

export function resolveRegion(
  override: Region | 'auto',
  lat: number | undefined,
  lon: number | undefined,
): Region {
  if (override !== 'auto') return override;
  if (lat === undefined || lon === undefined) return 'other';
  return detectRegion(lat, lon);
}

export function isChina(lat: number, lon: number): boolean {
  return detectRegion(lat, lon) === 'china';
}

export type Place = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  distanceMeters?: number;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  source: 'wikipedia' | 'osm' | 'amap' | 'baidu';
  score?: number;
};


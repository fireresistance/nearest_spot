export type PlaceCategory = 'museum' | 'park' | 'worship' | 'monument' | 'historic' | 'other';

export type Place = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  distanceMeters?: number;
  thumbnailUrl?: string;
  sourceUrl?: string;
  description?: string;
  source: 'wikipedia' | 'osm' | 'amap' | 'baidu' | 'google';
  category?: PlaceCategory;
  score?: number;
};


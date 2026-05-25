import type { MockLocation } from '../constants/mockLocations';

export type LocationOverride =
  | { kind: 'none' }
  | { kind: 'mock'; mock: MockLocation };


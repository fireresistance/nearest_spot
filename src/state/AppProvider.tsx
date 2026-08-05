import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { Place } from '../types/place';
import { readJson, writeJson } from './storage';
import type { LocationOverride } from './locationOverride';
import type { WikiLang } from '../services/wikipedia';
import type { Region } from '../services/region';
import { t, setUiLocale, type UILocaleSetting } from '../i18n';

export type TravelMode = 'walk' | 'drive';
export type ThemeMode = 'light' | 'dark';

export type Settings = {
  radiusMeters: number;
  travelMode: TravelMode;
  requireImage: boolean;
  wikiLang: WikiLang;
  amapKey: string;
  googleKey: string;
  regionOverride: Region | 'auto';
  theme: ThemeMode;
  uiLocale: UILocaleSetting;
};

type LocationState =
  | { status: 'unknown' }
  | { status: 'denied' }
  | { status: 'granted'; coords: { lat: number; lon: number }; updatedAtMs: number };

type AppState = {
  settings: Settings;
  setSettings: (updater: (prev: Settings) => Settings) => void;
  location: LocationState;
  refreshLocation: () => Promise<void>;
  locationOverride: LocationOverride;
  setLocationOverride: (override: LocationOverride) => void;
  seenPlaceIds: Set<string>;
  markSeen: (placeId: string) => void;
  unmarkSeen: (placeId: string) => void;
  resetSeen: () => void;
  savedPlaces: Record<string, Place>;
  toggleSaved: (place: Place) => void;
  isSaved: (placeId: string) => boolean;
};

const SETTINGS_KEY = 'settings.v2';
const SEEN_KEY = 'seen.v1';
const SAVED_KEY = 'saved.v1';
const LOCATION_OVERRIDE_KEY = 'locationOverride.v1';

const DEFAULT_SETTINGS: Settings = {
  radiusMeters: 10000,
  travelMode: 'drive',
  requireImage: false,
  wikiLang: 'auto',
  amapKey: '',
  googleKey: '',
  regionOverride: 'auto',
  theme: 'light',
  uiLocale: 'auto',
};

const MAX_SEEN_IDS = 5000;

const AppContext = createContext<AppState | null>(null);

export function AppProvider(props: { children: React.ReactNode; initialLocationOverride?: LocationOverride }) {
  const initialOverride: LocationOverride = props.initialLocationOverride ?? { kind: 'none' };
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [location, setLocation] = useState<LocationState>(() => {
    if (initialOverride.kind === 'mock') {
      return {
        status: 'granted',
        coords: { lat: initialOverride.mock.lat, lon: initialOverride.mock.lon },
        updatedAtMs: Date.now(),
      };
    }
    return { status: 'unknown' };
  });
  const [locationOverride, setLocationOverrideState] = useState<LocationOverride>(initialOverride);
  const [seenPlaceIds, setSeenPlaceIds] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Record<string, Place>>({});

  useEffect(() => {
    (async () => {
      const [storedSettings, storedSeen, storedSaved, storedLocationOverride] = await Promise.all([
        readJson<Settings>(SETTINGS_KEY),
        readJson<string[]>(SEEN_KEY),
        readJson<Record<string, Place>>(SAVED_KEY),
        readJson<LocationOverride>(LOCATION_OVERRIDE_KEY),
      ]);
      if (storedSettings) {
        const merged = { ...DEFAULT_SETTINGS, ...storedSettings };
        merged.radiusMeters = Math.min(100000, Math.max(100, merged.radiusMeters));
        setSettingsState(merged);
      }
      if (storedSeen) setSeenPlaceIds(new Set(storedSeen));
      if (storedSaved) setSavedPlaces(storedSaved);
      if (storedLocationOverride) {
        setLocationOverrideState(storedLocationOverride);
        if (storedLocationOverride.kind === 'mock') {
          setLocation({
            status: 'granted',
            coords: { lat: storedLocationOverride.mock.lat, lon: storedLocationOverride.mock.lon },
            updatedAtMs: Date.now(),
          });
        }
      }
    })();
  }, []);

  const setSettings = useCallback((updater: (prev: Settings) => Settings) => {
    setSettingsState((prev) => {
      const next = updater(prev);
      void writeJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const setLocationOverride = useCallback((override: LocationOverride) => {
    setLocationOverrideState(() => {
      void writeJson(LOCATION_OVERRIDE_KEY, override);
      return override;
    });

    if (override.kind === 'mock') {
      setLocation({
        status: 'granted',
        coords: { lat: override.mock.lat, lon: override.mock.lon },
        updatedAtMs: Date.now(),
      });
    } else {
      setLocation({ status: 'unknown' });
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    if (locationOverride.kind === 'mock') {
      setLocation({
        status: 'granted',
        coords: { lat: locationOverride.mock.lat, lon: locationOverride.mock.lon },
        updatedAtMs: Date.now(),
      });
      return;
    }

    const perm = await Location.getForegroundPermissionsAsync();
    let status = perm.status;
    if (status !== Location.PermissionStatus.GRANTED) {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }

    if (status !== Location.PermissionStatus.GRANTED) {
      setLocation({ status: 'denied' });
      return;
    }

    let pos = await Location.getLastKnownPositionAsync();
    const STALE_MS = 5 * 60 * 1000;
    const isStale = !pos || Date.now() - pos.timestamp > STALE_MS;
    if (isStale) {
      pos = await new Promise<Location.LocationObject>((resolve, reject) => {
        let sub: Location.LocationSubscription | null = null;
        const timeout = setTimeout(() => {
          if (sub) sub.remove();
          if (pos) {
            resolve(pos);
          } else {
            reject(new Error(t('error_location_failed')));
          }
        }, 15000);
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 1000 },
          (location) => {
            clearTimeout(timeout);
            if (sub) sub.remove();
            resolve(location);
          }
        ).then((s) => {
          sub = s;
        });
      });
    }
    if (!pos) {
      setLocation({ status: 'denied' });
      return;
    }
    setLocation({
      status: 'granted',
      coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
      updatedAtMs: Date.now(),
    });
  }, [locationOverride]);

  useEffect(() => {
    void refreshLocation().catch((e) => {
      Alert.alert(t('error_location_title'), String(e));
    });
  }, [refreshLocation]);

  const markSeen = useCallback((placeId: string) => {
    setSeenPlaceIds((prev) => {
      if (prev.has(placeId)) return prev;
      const next = new Set(prev);
      next.add(placeId);
      while (next.size > MAX_SEEN_IDS) {
        const oldest = next.values().next().value;
        if (oldest === undefined) break;
        next.delete(oldest);
      }
      void writeJson(SEEN_KEY, Array.from(next));
      return next;
    });
  }, []);

  const unmarkSeen = useCallback((placeId: string) => {
    setSeenPlaceIds((prev) => {
      if (!prev.has(placeId)) return prev;
      const next = new Set(prev);
      next.delete(placeId);
      void writeJson(SEEN_KEY, Array.from(next));
      return next;
    });
  }, []);

  const resetSeen = useCallback(() => {
    setSeenPlaceIds(() => {
      void writeJson(SEEN_KEY, []);
      return new Set();
    });
  }, []);

  const toggleSaved = useCallback((place: Place) => {
    setSavedPlaces((prev) => {
      const next = { ...prev };
      if (next[place.id]) {
        delete next[place.id];
      } else {
        next[place.id] = place;
      }
      void writeJson(SAVED_KEY, next);
      return next;
    });
  }, []);

  const isSaved = useCallback((placeId: string) => Boolean(savedPlaces[placeId]), [savedPlaces]);

  setUiLocale(settings.uiLocale);

  const value = useMemo<AppState>(
    () => ({
      settings,
      setSettings,
      location,
      refreshLocation,
      locationOverride,
      setLocationOverride,
      seenPlaceIds,
      markSeen,
      unmarkSeen,
      resetSeen,
      savedPlaces,
      toggleSaved,
      isSaved,
    }),
    [
      isSaved,
      location,
      locationOverride,
      markSeen,
      unmarkSeen,
      refreshLocation,
      resetSeen,
      savedPlaces,
      seenPlaceIds,
      setLocationOverride,
      settings,
      setSettings,
      toggleSaved,
    ],
  );

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppProvider is missing');
  return ctx;
}

export async function openAppSettings() {
  await Linking.openSettings();
}

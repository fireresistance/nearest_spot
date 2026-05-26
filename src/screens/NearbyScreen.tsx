import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp, openAppSettings } from '../state/AppProvider';
import { fetchNearbyPlaces, enrichPlacesWithImages } from '../services/wikipedia';
import { fetchNearbyPlacesOSM } from '../services/osm';
import { fetchNearbyPlacesAmap } from '../services/amap';
import { enrichPlaceWithBaike } from '../services/baidu';
import { searchBaikeImage } from '../services/baiduImage';
import { fetchNearbyPlacesGoogle, searchGooglePhoto } from '../services/google';
import { enrichPlacesWithFallbackImages } from '../services/imageSearch';
import { detectRegion, type Region } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';
import { openNavigationPicker } from '../services/navigation';
import type { NearbyStackParamList } from '../navigation/RootNavigator';
import { PrimaryButton } from '../ui/PrimaryButton';
import { PlaceCard } from '../ui/PlaceCard';
import type { Place } from '../types/place';
import { MOCK_LOCATIONS } from '../constants/mockLocations';

type Props = NativeStackScreenProps<NearbyStackParamList, 'Nearby'>;

export function NearbyScreen({ navigation }: Props) {
  const {
    settings,
    location,
    refreshLocation,
    locationOverride,
    setLocationOverride,
    seenPlaceIds,
    markSeen,
    isSaved,
    toggleSaved,
  } = useApp();
  const [queue, setQueue] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenInSessionRef = useRef<Set<string>>(new Set());
  const [exhausted, setExhausted] = useState(false);
  const exhaustedRef = useRef(false);
  const queueIdsRef = useRef<Set<string>>(new Set());
  const [currentRegion, setCurrentRegion] = useState<Region>('other');

  const loadingRef = useRef(false);
  const seenPlaceIdsRef = useRef(seenPlaceIds);
  useEffect(() => {
    seenPlaceIdsRef.current = seenPlaceIds;
  });

  const setExhaustedBoth = useCallback((v: boolean) => {
    exhaustedRef.current = v;
    setExhausted(v);
  }, []);

  const canLoad = location.status === 'granted';

  const enqueueUnique = useCallback(
    (incoming: Place[]) => {
      setQueue((prev) => {
        const seenIds = seenPlaceIdsRef.current;
        const existing = new Set(prev.map((p) => p.id));
        const next = [...prev];
        for (const p of incoming) {
          if (seenIds.has(p.id)) continue;
          if (seenInSessionRef.current.has(p.id)) continue;
          if (existing.has(p.id)) {
            const idx = next.findIndex((q) => q.id === p.id);
            if (idx >= 0 && !next[idx].thumbnailUrl && p.thumbnailUrl) {
              next[idx] = p;
            }
            continue;
          }
          existing.add(p.id);
          next.push(p);
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    queueIdsRef.current = new Set(queue.map((p) => p.id));
  }, [queue]);

  const loadMore = useCallback(async () => {
    if (!canLoad) return;
    if (exhaustedRef.current) return;
    if (loadingRef.current) return;
    const coords = location.coords;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      let places: Place[] = [];
      const region =
        settings.regionOverride === 'auto'
          ? detectRegion(coords.lat, coords.lon)
          : settings.regionOverride;
      setCurrentRegion(region);

      if (settings.googleKey) {
        try {
          places = await fetchNearbyPlacesGoogle({
            lat: coords.lat,
            lon: coords.lon,
            radiusMeters: settings.radiusMeters,
            limit: 30,
            googleKey: settings.googleKey,
            requireImage: settings.requireImage,
          });
        } catch (e) {
          console.log('[NEARBY] Google Places failed:', String(e));
        }
      }

      if (places.length === 0 && region === 'china' && settings.amapKey) {
        try {
          places = await fetchNearbyPlacesAmap({
            lat: coords.lat,
            lon: coords.lon,
            radiusMeters: settings.radiusMeters,
            limit: 20,
            amapKey: settings.amapKey,
            requireImage: settings.requireImage,
          });
          if (places.length > 0) {
            const enriched = await Promise.all(
              places.slice(0, 5).map(async (p) => {
                if (p.thumbnailUrl) return p;
                try {
                  const imgUrl = await searchBaikeImage(p.title);
                  return imgUrl ? { ...p, thumbnailUrl: imgUrl } as Place : p;
                } catch {
                  return p;
                }
              }),
            );
            const enrichedIds = new Set(enriched.map((p) => p.id));
            places = [...enriched, ...places.filter((p) => !enrichedIds.has(p.id))];
          }
        } catch (e) {
          console.log('[NEARBY] Amap failed:', String(e));
        }
      }

      if (places.length === 0) {
        const [wikiPlaces, osmPlaces] = await Promise.allSettled([
          fetchNearbyPlaces({
            lat: coords.lat,
            lon: coords.lon,
            radiusMeters: settings.radiusMeters,
            limit: 30,
            requireImage: false,
            wikiLang: settings.wikiLang,
          }),
          fetchNearbyPlacesOSM({
            lat: coords.lat,
            lon: coords.lon,
            radiusMeters: settings.radiusMeters,
            limit: 100,
          }),
        ]);

        const wiki = wikiPlaces.status === 'fulfilled' ? wikiPlaces.value : [];
        const osm = osmPlaces.status === 'fulfilled' ? osmPlaces.value : [];
        console.log(`[NEARBY] Combined: wiki=${wiki.length}, osm=${osm.length}`);

        const seenCoords = new Set<string>();
        const combined: Place[] = [];
        for (const p of [...wiki, ...osm]) {
          const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
          if (seenCoords.has(key)) continue;
          seenCoords.add(key);
          combined.push(p);
        }
        places = combined;
      }

      if (places.length > 0) {
        try {
          places = await enrichPlacesWithImages(places, settings.wikiLang);
        } catch {
          // enrichment failed
        }

        if (region === 'china') {
          const toEnrich = places.filter((p) => !p.thumbnailUrl).slice(0, 5);
          if (toEnrich.length > 0) {
            const baikeResults = await Promise.allSettled(
              toEnrich.map(async (p) => {
                const imgUrl = await searchBaikeImage(p.title);
                return { id: p.id, thumbnailUrl: imgUrl };
              }),
            );
            const baikeMap = new Map<string, string>();
            for (const r of baikeResults) {
              if (r.status === 'fulfilled' && r.value?.thumbnailUrl) {
                baikeMap.set(r.value.id, r.value.thumbnailUrl);
              }
            }
            if (baikeMap.size > 0) {
              places = places.map((p) => {
                const imgUrl = baikeMap.get(p.id);
                if (!imgUrl) return p;
                return { ...p, thumbnailUrl: imgUrl } as Place;
              });
            }
          }
        }

        if (settings.googleKey) {
          const withoutImg = places.filter((p) => !p.thumbnailUrl).slice(0, 5);
          if (withoutImg.length > 0) {
            const photoResults = await Promise.allSettled(
              withoutImg.map(async (p) => {
                const photoUrl = await searchGooglePhoto({
                  title: p.title,
                  lat: p.lat,
                  lon: p.lon,
                  googleKey: settings.googleKey,
                });
                return { id: p.id, thumbnailUrl: photoUrl };
              }),
            );
            const photoMap = new Map<string, string>();
            for (const r of photoResults) {
              if (r.status === 'fulfilled' && r.value?.thumbnailUrl) {
                photoMap.set(r.value.id, r.value.thumbnailUrl);
              }
            }
            if (photoMap.size > 0) {
              places = places.map((p) => {
                const url = photoMap.get(p.id);
                if (!url) return p;
                return { ...p, thumbnailUrl: url } as Place;
              });
            }
          }
        }

        const stillWithoutImg = places.filter((p) => !p.thumbnailUrl);
        if (stillWithoutImg.length > 0) {
          try {
            const fallbackMap = await enrichPlacesWithFallbackImages(stillWithoutImg, settings.requireImage ? 15 : 8);
            if (fallbackMap.size > 0) {
              places = places.map((p) => {
                const url = fallbackMap.get(p.id);
                if (!url) return p;
                return { ...p, thumbnailUrl: url } as Place;
              });
            }
          } catch {
            // fallback image search failed
          }
        }

        if (settings.requireImage) {
          const before = places.length;
          places = places.filter((p) => !!p.thumbnailUrl);
          console.log('[NEARBY] requireImage filter:', before, '->', places.length);
        }

        places.sort((a, b) => {
          const aImg = a.thumbnailUrl ? 40 : 0;
          const bImg = b.thumbnailUrl ? 40 : 0;
          const aScore = (a.score ?? 0) + aImg;
          const bScore = (b.score ?? 0) + bImg;
          if (aScore !== bScore) return bScore - aScore;
          return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
        });
      }

      const existingIds = queueIdsRef.current;
      const seenIds = seenPlaceIdsRef.current;
      let wouldAdd = 0;
      for (const p of places) {
        if (seenIds.has(p.id)) continue;
        if (seenInSessionRef.current.has(p.id)) continue;
        if (existingIds.has(p.id)) continue;
        wouldAdd += 1;
      }
      enqueueUnique(places);
      if (wouldAdd === 0) {
        setExhaustedBoth(true);
      }
    } catch (e) {
      setError(String(e));
      setExhaustedBoth(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [canLoad, enqueueUnique, location, setExhaustedBoth, settings]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    setQueue([]);
    queueIdsRef.current.clear();
    setExhaustedBoth(false);
    if (location.status === 'granted') {
      void loadMoreRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status, settings.radiusMeters, settings.requireImage, settings.wikiLang, settings.amapKey, settings.googleKey, settings.regionOverride, setExhaustedBoth]);

  useEffect(() => {
    if (!exhausted && queue.length < 15 && !loading && location.status === 'granted') {
      void loadMoreRef.current();
    }
  }, [exhausted, loading, location.status, queue.length]);

  useEffect(() => {
    if (seenPlaceIds.size === 0) {
      seenInSessionRef.current.clear();
    }
  }, [seenPlaceIds]);

  const current = queue[0];
  const swipeX = useRef(new Animated.Value(0)).current;

  const dismissCurrent = useCallback(() => {
    if (!current) return;
    seenInSessionRef.current.add(current.id);
    markSeen(current.id);
    setQueue((prev) => prev.slice(1));
  }, [current, markSeen]);

  const panResponder = useMemo(() => {
    const threshold = 120;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 24,
      onPanResponderMove: (_, g) => {
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) >= threshold) {
          const toValue = g.dx > 0 ? 600 : -600;
          Animated.timing(swipeX, { toValue, duration: 160, useNativeDriver: true }).start(() => {
            swipeX.setValue(0);
            dismissCurrent();
          });
          return;
        }

        Animated.spring(swipeX, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }).start();
      },
    });
  }, [dismissCurrent, swipeX]);

  const actions = useMemo(() => {
    if (!current) return null;

    const saved = isSaved(current.id);
    return (
      <View style={styles.actionsRow}>
        <PrimaryButton
          title="Маршрут"
          onPress={() => {
            openNavigationPicker(current.lat, current.lon, settings.travelMode, currentRegion);
          }}
        />
        <View style={styles.actionsRow2}>
          <PrimaryButton
            title={saved ? 'Убрать' : 'Сохранить'}
            variant="secondary"
            onPress={() => toggleSaved(current)}
          />
          <PrimaryButton
            title="Дальше"
            variant="secondary"
            onPress={() => {
              dismissCurrent();
            }}
          />
        </View>
      </View>
    );
  }, [current, dismissCurrent, isSaved, settings.travelMode, toggleSaved]);

  if (location.status === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Нужна геолокация</Text>
        <Text style={styles.body}>
          Чтобы показывать места рядом, приложению нужен доступ к местоположению "При использовании".
        </Text>
        <View style={styles.stack}>
          <PrimaryButton
            title="Разрешить"
            onPress={async () => {
              await refreshLocation();
            }}
          />
          <PrimaryButton
            title="Открыть настройки"
            variant="secondary"
            onPress={async () => {
              await openAppSettings();
            }}
          />
          <View style={styles.mockBox}>
            <Text style={styles.mockTitle}>Или выбери мок-локацию</Text>
            <View style={styles.mockRow}>
              <PrimaryButton
                title="Текущая"
                variant={locationOverride.kind === 'none' ? 'primary' : 'secondary'}
                onPress={async () => {
                  setLocationOverride({ kind: 'none' });
                  await refreshLocation();
                }}
              />
              {MOCK_LOCATIONS.slice(0, 3).map((m) => (
                <PrimaryButton
                  key={m.id}
                  title={m.title}
                  variant={locationOverride.kind === 'mock' && locationOverride.mock.id === m.id ? 'primary' : 'secondary'}
                  onPress={() => setLocationOverride({ kind: 'mock', mock: m })}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!canLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.body}>Определяем местоположение…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {current ? (
        <Animated.View
          style={[
            styles.swipeWrap,
            {
              transform: [
                { translateX: swipeX },
                {
                  rotate: swipeX.interpolate({
                    inputRange: [-250, 0, 250],
                    outputRange: ['-8deg', '0deg', '8deg'],
                  }),
                },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <PlaceCard
            place={current}
            travelMode={settings.travelMode}
            region={currentRegion}
            onOpen={() => navigation.navigate('PlaceDetails', { place: current })}
            actions={actions}
          />
        </Animated.View>
      ) : (
        <View style={styles.center}>
          {loading ? <ActivityIndicator /> : null}
          <Text style={styles.title}>Нет подходящих мест</Text>
          <Text style={styles.body}>Попробуй увеличить радиус или выключить "Только с фото".</Text>
          <View style={styles.stack}>
            <PrimaryButton
              title="Обновить"
              onPress={async () => {
                setExhaustedBoth(false);
                setQueue([]);
                queueIdsRef.current.clear();
                await refreshLocation();
                void loadMoreRef.current();
              }}
              disabled={loading}
            />
          </View>
        </View>
      )}
      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  swipeWrap: { flex: 1 },
  center: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { fontSize: 15, color: '#374151', textAlign: 'center', lineHeight: 20 },
  stack: { width: '100%', gap: 10, marginTop: 6 },
  actionsRow: { gap: 10 },
  actionsRow2: { flexDirection: 'row', gap: 10 },
  mockBox: { width: '100%', gap: 8, marginTop: 6 },
  mockTitle: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  mockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  error: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: '#991B1B', fontSize: 13 },
});

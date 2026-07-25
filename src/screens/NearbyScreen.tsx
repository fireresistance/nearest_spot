import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp, openAppSettings } from '../state/AppProvider';
import { fetchNearbyPlaces } from '../services/wikipedia';
import { fetchNearbyPlacesOSM } from '../services/osm';
import { fetchNearbyPlacesAmap } from '../services/amap';
import { searchBaikeImage } from '../services/baiduImage';
import { fetchNearbyPlacesGoogle, searchGooglePhoto } from '../services/google';
import { enrichPlacesWithFallbackImages } from '../services/imageSearch';
import { detectRegion, type Region } from '../services/region';
import { openNavigationPicker } from '../services/navigation';
import type { NearbyStackParamList } from '../navigation/RootNavigator';
import { PrimaryButton } from '../ui/PrimaryButton';
import { PlaceCard } from '../ui/PlaceCard';
import { useTheme, type Theme } from '../ui/theme';
import type { Place, PlaceCategory } from '../types/place';
import { MOCK_LOCATIONS } from '../constants/mockLocations';
import { t, type TranslationKey } from '../i18n';

type Props = NativeStackScreenProps<NearbyStackParamList, 'Nearby'>;

type SourceStage = 'google' | 'amap' | 'wiki' | 'done';

const UNDO_TIMEOUT_MS = 4000;

const CATEGORY_OPTIONS: { value: PlaceCategory | 'all'; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'cat_all' },
  { value: 'museum', labelKey: 'cat_museum' },
  { value: 'park', labelKey: 'cat_park' },
  { value: 'worship', labelKey: 'cat_worship' },
  { value: 'monument', labelKey: 'cat_monument' },
  { value: 'historic', labelKey: 'cat_historic' },
  { value: 'other', labelKey: 'cat_other' },
];

export function NearbyScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    settings,
    location,
    refreshLocation,
    locationOverride,
    setLocationOverride,
    seenPlaceIds,
    markSeen,
    unmarkSeen,
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
  const [undoPlace, setUndoPlace] = useState<Place | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageRef = useRef<SourceStage>('google');
  const googleTokenRef = useRef<string | undefined>(undefined);
  const amapPageRef = useRef(1);
  const amapHasMoreRef = useRef(true);

  const loadingRef = useRef(false);
  const seenPlaceIdsRef = useRef(seenPlaceIds);
  useEffect(() => {
    seenPlaceIdsRef.current = seenPlaceIds;
  });

  const setExhaustedBoth = useCallback((v: boolean) => {
    exhaustedRef.current = v;
    setExhausted(v);
  }, []);

  const resetFeed = useCallback(() => {
    setQueue([]);
    queueIdsRef.current.clear();
    setExhaustedBoth(false);
    stageRef.current = 'google';
    googleTokenRef.current = undefined;
    amapPageRef.current = 1;
    amapHasMoreRef.current = true;
  }, [setExhaustedBoth]);

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
      const region =
        settings.regionOverride === 'auto'
          ? detectRegion(coords.lat, coords.lon)
          : settings.regionOverride;
      setCurrentRegion(region);
      console.log('[feed] loadMore start', coords.lat.toFixed(5), coords.lon.toFixed(5), 'region:', region, 'radius:', settings.radiusMeters);

      let addedAny = false;
      let iterations = 0;
      const reasons: string[] = [];

      while (!addedAny && iterations < 3) {
        iterations += 1;
        if (stageRef.current === 'done') break;

        let places: Place[] = [];

        if (stageRef.current === 'google') {
          if (!settings.googleKey) {
            stageRef.current = 'amap';
            continue;
          }
          try {
            const page = await fetchNearbyPlacesGoogle({
              lat: coords.lat,
              lon: coords.lon,
              radiusMeters: settings.radiusMeters,
              googleKey: settings.googleKey,
              requireImage: settings.requireImage,
              pageToken: googleTokenRef.current,
            });
            googleTokenRef.current = page.nextPageToken;
            places = page.places;
            if (!page.nextPageToken) stageRef.current = 'amap';
          } catch (e) {
            reasons.push(`google: ${String(e)}`);
            stageRef.current = 'amap';
          }
          if (places.length === 0) continue;
        }

        if (stageRef.current === 'amap') {
          if (region !== 'china' || !settings.amapKey || !amapHasMoreRef.current) {
            stageRef.current = 'wiki';
            continue;
          }
          try {
            const page = await fetchNearbyPlacesAmap({
              lat: coords.lat,
              lon: coords.lon,
              radiusMeters: settings.radiusMeters,
              amapKey: settings.amapKey,
              requireImage: settings.requireImage,
              page: amapPageRef.current,
            });
            amapPageRef.current += 1;
            amapHasMoreRef.current = page.hasMore;
            places = page.places;
            if (!page.hasMore) stageRef.current = 'wiki';
          } catch (e) {
            reasons.push(`amap: ${String(e)}`);
            stageRef.current = 'wiki';
          }
          if (places.length === 0) continue;
        }

        if (stageRef.current === 'wiki') {
          stageRef.current = 'done';
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
          if (wikiPlaces.status === 'rejected') reasons.push(`wiki: ${String(wikiPlaces.reason)}`);
          if (osmPlaces.status === 'rejected') reasons.push(`osm: ${String(osmPlaces.reason)}`);
          console.log('[feed] wiki:', wiki.length, 'osm:', osm.length, 'errors:', reasons.join(' | '));

          const seenCoords = new Set<string>();
          const combined: Place[] = [];
          for (const p of [...wiki, ...osm]) {
            const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
            if (seenCoords.has(key)) continue;
            seenCoords.add(key);
            combined.push(p);
          }
          places = combined;
          if (places.length === 0) break;
        }

        if (places.length > 0) {
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
            places = places.filter((p) => !!p.thumbnailUrl);
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
        addedAny = wouldAdd > 0;
      }

      if (!addedAny && stageRef.current === 'done') {
        setExhaustedBoth(true);
        if (reasons.length > 0) setError(reasons.join('\n'));
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

  const lat = location.status === 'granted' ? location.coords.lat : 0;
  const lon = location.status === 'granted' ? location.coords.lon : 0;

  useEffect(() => {
    resetFeed();
    if (location.status === 'granted') {
      void loadMoreRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status, lat, lon, settings.radiusMeters, settings.requireImage, settings.wikiLang, settings.amapKey, settings.googleKey, settings.regionOverride, resetFeed]);

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

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | 'all'>('all');
  const visibleQueue = useMemo(
    () =>
      categoryFilter === 'all'
        ? queue
        : queue.filter((p) => (p.category ?? 'other') === categoryFilter),
    [queue, categoryFilter],
  );

  const current = visibleQueue[0];
  const swipeX = useRef(new Animated.Value(0)).current;

  const dismissCurrent = useCallback(() => {
    if (!current) return;
    seenInSessionRef.current.add(current.id);
    markSeen(current.id);
    setQueue((prev) => prev.filter((p) => p.id !== current.id));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoPlace(current);
    undoTimerRef.current = setTimeout(() => setUndoPlace(null), UNDO_TIMEOUT_MS);
  }, [current, markSeen]);

  const undoDismiss = useCallback(() => {
    if (!undoPlace) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    seenInSessionRef.current.delete(undoPlace.id);
    unmarkSeen(undoPlace.id);
    setQueue((prev) => (prev.some((p) => p.id === undoPlace.id) ? prev : [undoPlace, ...prev]));
    setUndoPlace(null);
  }, [undoPlace, unmarkSeen]);

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

  const shareCurrent = useCallback(() => {
    if (!current) return;
    const url =
      current.sourceUrl ??
      `https://www.google.com/maps/search/?api=1&query=${current.lat},${current.lon}`;
    void Share.share({ message: `${current.title}\n${url}` }).catch(() => {});
  }, [current]);

  const actions = useMemo(() => {
    if (!current) return null;

    const saved = isSaved(current.id);
    return (
      <View style={styles.actionsRow}>
        <PrimaryButton
          title={t('btn_route')}
          onPress={() => {
            openNavigationPicker(current.lat, current.lon, settings.travelMode, currentRegion);
          }}
        />
        <View style={styles.actionsRow2}>
          <View style={styles.actionBtn}>
            <PrimaryButton
              title={saved ? t('btn_unsave') : t('btn_save')}
              variant="secondary"
              onPress={() => toggleSaved(current)}
            />
          </View>
          <View style={styles.actionBtn}>
            <PrimaryButton
              title={t('btn_next')}
              variant="secondary"
              onPress={() => {
                dismissCurrent();
              }}
            />
          </View>
          <View style={styles.actionBtn}>
            <PrimaryButton title={t('btn_share')} variant="secondary" onPress={shareCurrent} />
          </View>
        </View>
      </View>
    );
  }, [current, currentRegion, dismissCurrent, isSaved, settings.travelMode, shareCurrent, toggleSaved]);

  if (location.status === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('nearby_need_location_title')}</Text>
        <Text style={styles.body}>
          {t('nearby_need_location_body')}
        </Text>
        <View style={styles.stack}>
          <PrimaryButton
            title={t('btn_allow')}
            onPress={async () => {
              await refreshLocation();
            }}
          />
          <PrimaryButton
            title={t('btn_open_settings')}
            variant="secondary"
            onPress={async () => {
              await openAppSettings();
            }}
          />
          <View style={styles.mockBox}>
            <Text style={styles.mockTitle}>{t('nearby_mock_title')}</Text>
            <View style={styles.mockRow}>
              <PrimaryButton
                title={t('btn_current')}
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
        <Text style={styles.body}>{t('nearby_locating')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {CATEGORY_OPTIONS.map((c) => {
            const active = categoryFilter === c.value;
            return (
              <Pressable
                key={c.value}
                onPress={() => setCategoryFilter(c.value)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{t(c.labelKey)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
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
      ) : queue.length > 0 ? (
        <View style={styles.center}>
          <Text style={styles.title}>{t('nearby_empty_category_title')}</Text>
          <Text style={styles.body}>{t('nearby_empty_category_body')}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          {loading ? <ActivityIndicator /> : null}
          <Text style={styles.title}>{t('nearby_empty_title')}</Text>
          <Text style={styles.body}>{t('nearby_empty_body')}</Text>
          <View style={styles.stack}>
            <PrimaryButton
              title={t('btn_refresh')}
              onPress={async () => {
                resetFeed();
                await refreshLocation();
                void loadMoreRef.current();
              }}
              disabled={loading}
            />
          </View>
        </View>
      )}
      {undoPlace ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText} numberOfLines={1}>
            {t('nearby_hidden_prefix')}{undoPlace.title}
          </Text>
          <PrimaryButton title={t('btn_undo')} onPress={undoDismiss} />
        </View>
      ) : null}
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    swipeWrap: { flex: 1 },
    chipsWrap: { borderBottomWidth: 1, borderBottomColor: t.sep },
    chipsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    chip: {
      height: 34,
      paddingHorizontal: 14,
      borderRadius: 17,
      backgroundColor: t.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: t.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: t.secondaryText },
    chipTextActive: { color: t.primaryText },
    center: {
      flex: 1,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: t.bg,
    },
    title: { fontSize: 20, fontWeight: '700', color: t.text, textAlign: 'center' },
    body: { fontSize: 15, color: t.textSecondary, textAlign: 'center', lineHeight: 20 },
    stack: { width: '100%', gap: 10, marginTop: 6 },
    actionsRow: { gap: 10 },
    actionsRow2: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1 },
    mockBox: { width: '100%', gap: 8, marginTop: 6 },
    mockTitle: { fontSize: 13, fontWeight: '700', color: t.text, textAlign: 'center' },
    mockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    undoBar: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      padding: 8,
      paddingLeft: 14,
      borderRadius: 12,
      backgroundColor: t.isDark ? '#1F2937' : '#111827',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    undoText: { flex: 1, color: '#FFFFFF', fontSize: 13 },
    error: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: t.errorBg,
      borderWidth: 1,
      borderColor: t.errorBorder,
    },
    errorText: { color: t.errorText, fontSize: 13 },
  });

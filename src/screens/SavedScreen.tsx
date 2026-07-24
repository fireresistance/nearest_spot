import { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SavedStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/AppProvider';
import { haversineDistanceMeters, formatDistance } from '../utils/geo';
import { resolveRegion } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';
import { openNavigationPicker } from '../services/navigation';
import { useTheme, type Theme } from '../ui/theme';

type Props = NativeStackScreenProps<SavedStackParamList, 'Saved'>;

export function SavedScreen({ navigation }: Props) {
  const { savedPlaces, location, settings } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const region = resolveRegion(
    settings.regionOverride,
    location.status === 'granted' ? location.coords.lat : undefined,
    location.status === 'granted' ? location.coords.lon : undefined,
  );

  const items = useMemo(() => {
    const arr = Object.values(savedPlaces);
    if (location.status !== 'granted') return arr;
    const here = location.coords;
    return arr
      .map((p) => ({
        place: p,
        dist: p.distanceMeters ?? haversineDistanceMeters(here, { lat: p.lat, lon: p.lon }),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((x) => ({ ...x.place, distanceMeters: x.dist }));
  }, [location, savedPlaces]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={items.length === 0 ? styles.empty : undefined}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.mapBtnWrap}>
              <Pressable style={styles.mapBtn} onPress={() => navigation.navigate('SavedMap')}>
                <Text style={styles.mapBtnText}>Показать на карте</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.title}>Пока пусто</Text>
            <Text style={styles.body}>Сохраняй места из ленты, чтобы не потерять.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('PlaceDetails', { place: item })}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: proxyImageUrl(item.thumbnailUrl, region) }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={styles.rowTitle}>
                {item.title}
              </Text>
              <Text style={styles.rowSub}>{item.distanceMeters ? formatDistance(item.distanceMeters) : '—'}</Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                openNavigationPicker(item.lat, item.lon, settings.travelMode, region);
              }}
              style={styles.routeBtn}
            >
              <Text style={styles.routeBtnText}>Маршрут</Text>
            </Pressable>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    empty: { flexGrow: 1, justifyContent: 'center' },
    emptyInner: { padding: 20, alignItems: 'center', gap: 10 },
    title: { fontSize: 20, fontWeight: '700', color: t.text },
    body: { fontSize: 15, color: t.textSecondary, textAlign: 'center' },
    row: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: t.mediaBg },
    thumbPlaceholder: { width: 54, height: 54, borderRadius: 12, backgroundColor: t.secondary },
    rowText: { flex: 1, gap: 4 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: t.text },
    rowSub: { fontSize: 13, color: t.textMuted },
    routeBtn: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: t.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeBtnText: { fontSize: 13, fontWeight: '700', color: t.secondaryText },
    sep: { height: 1, backgroundColor: t.sep, marginLeft: 82 },
    mapBtnWrap: { paddingHorizontal: 16, paddingVertical: 10 },
    mapBtn: {
      height: 44,
      borderRadius: 12,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapBtnText: { fontSize: 15, fontWeight: '700', color: t.primaryText },
  });

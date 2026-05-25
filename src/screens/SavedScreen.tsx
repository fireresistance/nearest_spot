import { useMemo } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SavedStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/AppProvider';
import { haversineDistanceMeters, formatDistance } from '../utils/geo';
import { detectRegion } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';
import { openNavigationPicker } from '../services/navigation';

type Props = NativeStackScreenProps<SavedStackParamList, 'Saved'>;

export function SavedScreen({ navigation }: Props) {
  const { savedPlaces, location, settings } = useApp();

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
              <Image source={{ uri: proxyImageUrl(item.thumbnailUrl, detectRegion(item.lat, item.lon)) }} style={styles.thumb} />
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
                const region = detectRegion(item.lat, item.lon);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  empty: { flexGrow: 1, justifyContent: 'center' },
  emptyInner: { padding: 20, alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  body: { fontSize: 15, color: '#374151', textAlign: 'center' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#111827' },
  thumbPlaceholder: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#E5E7EB' },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 13, color: '#6B7280' },
  routeBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBtnText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  sep: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 82 },
});

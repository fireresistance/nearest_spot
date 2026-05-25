import { useMemo } from 'react';
import { Dimensions, FlatList, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NearbyStackParamList, SavedStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/AppProvider';
import { buildMapsDirectionsUrl } from '../services/wikipedia';
import { PrimaryButton } from '../ui/PrimaryButton';
import { detectRegion } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';
import { openNavigationPicker } from '../services/navigation';

const SOURCE_LABELS: Record<string, string> = {
  wikipedia: 'Wikipedia',
  osm: 'OpenStreetMap',
  amap: '高德地图 Amap',
  baidu: '百度百科 Baidu',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

type Props =
  | NativeStackScreenProps<NearbyStackParamList, 'PlaceDetails'>
  | NativeStackScreenProps<SavedStackParamList, 'PlaceDetails'>;

export function PlaceDetailsScreen({ route }: Props) {
  const { place } = route.params;
  const { settings, isSaved, toggleSaved } = useApp();
  const width = Dimensions.get('window').width;

  const imageHeaders = useMemo(() => {
    const region = detectRegion(place.lat, place.lon);
    const proxied = proxyImageUrl(place.thumbnailUrl, region);
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    };
    if (proxied?.includes('bkimg.cdn.bcebos.com') || proxied?.includes('baike.baidu.com')) {
      headers['Referer'] = 'https://baike.baidu.com/';
    } else if (proxied?.includes('wikimedia.org') || proxied?.includes('wikipedia.org')) {
      headers['Referer'] = 'https://en.wikipedia.org/';
    }
    return headers;
  }, [place.thumbnailUrl, place.lat, place.lon]);

  const images = useMemo(() => {
    const region = detectRegion(place.lat, place.lon);
    const proxied = proxyImageUrl(place.thumbnailUrl, region);
    const arr = proxied ? [proxied] : [];
    return arr;
  }, [place.thumbnailUrl, place.lat, place.lon]);

  const saved = isSaved(place.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.media}>
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(u) => u}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <Image source={{ uri: item, headers: imageHeaders }} style={[styles.image, { width }]} />}
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{place.title}</Text>
        {place.description ? <Text style={styles.body}>{place.description}</Text> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.buttons}>
          <PrimaryButton
            title="Маршрут"
            onPress={() => {
              const region = detectRegion(place.lat, place.lon);
              openNavigationPicker(place.lat, place.lon, settings.travelMode, region);
            }}
          />
          <PrimaryButton
            title={saved ? 'Убрать из сохранённых' : 'Сохранить'}
            variant="secondary"
            onPress={() => toggleSaved(place)}
          />
          {place.sourceUrl ? (
            <PrimaryButton
              title="Открыть источник"
              variant="secondary"
              onPress={async () => {
                await Linking.openURL(place.sourceUrl!);
              }}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.meta}>Источник: {sourceLabel(place.source)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 24 },
  media: { height: 320, backgroundColor: '#0F172A' },
  image: { height: 320, resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, backgroundColor: '#0F172A' },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  body: { fontSize: 15, lineHeight: 21, color: '#374151' },
  buttons: { gap: 10 },
  meta: { fontSize: 13, color: '#6B7280' },
});

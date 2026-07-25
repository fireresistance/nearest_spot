import { useMemo } from 'react';
import { Dimensions, FlatList, Image, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NearbyStackParamList, SavedStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/AppProvider';
import { PrimaryButton } from '../ui/PrimaryButton';
import { resolveRegion } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';
import { openNavigationPicker } from '../services/navigation';
import { useTheme, type Theme } from '../ui/theme';
import { t } from '../i18n';

const SOURCE_LABELS: Record<string, string> = {
  wikipedia: 'Wikipedia',
  osm: 'OpenStreetMap',
  amap: '高德地图 Amap',
  baidu: '百度百科 Baidu',
  google: 'Google Places',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

type Props =
  | NativeStackScreenProps<NearbyStackParamList, 'PlaceDetails'>
  | NativeStackScreenProps<SavedStackParamList, 'PlaceDetails'>;

export function PlaceDetailsScreen({ route }: Props) {
  const { place } = route.params;
  const { settings, location, isSaved, toggleSaved } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const width = Dimensions.get('window').width;

  const userLat = location.status === 'granted' ? location.coords.lat : undefined;
  const userLon = location.status === 'granted' ? location.coords.lon : undefined;
  const region = resolveRegion(settings.regionOverride, userLat, userLon);

  const imageUrl = useMemo(
    () => proxyImageUrl(place.thumbnailUrl, region),
    [place.thumbnailUrl, region],
  );

  const imageHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    };
    if (imageUrl?.includes('bkimg.cdn.bcebos.com') || imageUrl?.includes('baike.baidu.com')) {
      headers['Referer'] = 'https://baike.baidu.com/';
    } else if (imageUrl?.includes('wikimedia.org') || imageUrl?.includes('wikipedia.org')) {
      headers['Referer'] = 'https://en.wikipedia.org/';
    }
    return headers;
  }, [imageUrl]);

  const images = useMemo(() => (imageUrl ? [imageUrl] : []), [imageUrl]);

  const saved = isSaved(place.id);

  const sharePlace = () => {
    const url =
      place.sourceUrl ??
      `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
    void Share.share({ message: `${place.title}\n${url}` }).catch(() => {});
  };

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
            title={t('btn_route')}
            onPress={() => {
              openNavigationPicker(place.lat, place.lon, settings.travelMode, region);
            }}
          />
          <PrimaryButton
            title={saved ? t('btn_unsave_long') : t('btn_save')}
            variant="secondary"
            onPress={() => toggleSaved(place)}
          />
          <PrimaryButton title={t('btn_share')} variant="secondary" onPress={sharePlace} />
          {place.sourceUrl ? (
            <PrimaryButton
              title={t('btn_open_source')}
              variant="secondary"
              onPress={async () => {
                await Linking.openURL(place.sourceUrl!);
              }}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.meta}>{t('details_source')}: {sourceLabel(place.source)}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 24 },
    media: { height: 320, backgroundColor: t.mediaBg },
    image: { height: 320, resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, backgroundColor: t.mediaBg },
    section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
    title: { fontSize: 24, fontWeight: '800', color: t.text },
    body: { fontSize: 15, lineHeight: 21, color: t.textSecondary },
    buttons: { gap: 10 },
    meta: { fontSize: 13, color: t.textMuted },
  });

import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import type { Place } from '../types/place';
import { estimateEtaMinutes, formatDistance, formatEtaMinutes } from '../utils/geo';
import type { TravelMode } from '../state/AppProvider';
import type { Region } from '../services/region';
import { proxyImageUrl } from '../services/imageProxy';

export function PlaceCard(props: {
  place: Place;
  travelMode: TravelMode;
  region: Region;
  onOpen: () => void;
  actions: React.ReactNode;
}) {
  const meters = props.place.distanceMeters;
  const eta = meters !== undefined ? estimateEtaMinutes(meters, props.travelMode) : null;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const thumbnailUrl = proxyImageUrl(props.place.thumbnailUrl, props.region);

  const imageHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  };
  if (thumbnailUrl?.includes('bkimg.cdn.bcebos.com') || thumbnailUrl?.includes('baike.baidu.com')) {
    imageHeaders['Referer'] = 'https://baike.baidu.com/';
  } else if (thumbnailUrl?.includes('wikimedia.org') || thumbnailUrl?.includes('wikipedia.org')) {
    imageHeaders['Referer'] = 'https://en.wikipedia.org/';
  }

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [thumbnailUrl]);

  const hasImage = !!thumbnailUrl && !imgError;
  // Show placeholder when there's no image, or while the image is still loading
  const showPlaceholder = !hasImage || !imgLoaded;

  return (
    <View style={styles.card}>
      <Pressable onPress={props.onOpen} style={styles.media}>
        {hasImage ? (
          <Image
            source={{
              uri: thumbnailUrl,
              headers: imageHeaders,
            }}
            style={styles.image}
            onError={() => {
              setImgError(true);
            }}
            onLoad={() => setImgLoaded(true)}
          />
        ) : null}
        {showPlaceholder ? (
          <View style={styles.imagePlaceholder}>
            {hasImage && !imgLoaded ? (
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" />
            ) : (
              <>
                <Text style={styles.placeholderIcon}>📍</Text>
                <Text style={styles.placeholderText} numberOfLines={1}>
                  {props.place.title}
                </Text>
              </>
            )}
          </View>
        ) : null}
        <View style={styles.scrim} />
        <View style={styles.mediaText}>
          <Text numberOfLines={2} style={styles.title}>
            {props.place.title}
          </Text>
          <Text style={styles.subtitle}>
            {meters !== undefined ? formatDistance(meters) : '—'} · {eta ? formatEtaMinutes(eta) : '—'}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>{props.actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  media: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 48,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '80%',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  mediaText: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
});

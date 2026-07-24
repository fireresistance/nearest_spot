import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SavedStackParamList } from '../navigation/RootNavigator';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../ui/theme';

type Props = NativeStackScreenProps<SavedStackParamList, 'SavedMap'>;

function buildHtml(markers: { lat: number; lon: number; title: string }[], isDark: boolean): string {
  const markersJson = JSON.stringify(markers).replace(/</g, '\\u003c');
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttrib = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map');
L.tileLayer('${tileUrl}', { maxZoom: 19, attribution: '${tileAttrib}' }).addTo(map);
var markers = ${markersJson};
var bounds = [];
markers.forEach(function(m) {
  L.marker([m.lat, m.lon]).addTo(map).bindPopup(m.title);
  bounds.push([m.lat, m.lon]);
});
if (bounds.length > 1) {
  map.fitBounds(bounds, { padding: [40, 40] });
} else if (bounds.length === 1) {
  map.setView(bounds[0], 14);
} else {
  map.setView([55.75, 37.61], 10);
}
</script>
</body>
</html>`;
}

export function SavedMapScreen(_props: Props) {
  const { savedPlaces } = useApp();
  const theme = useTheme();

  const html = useMemo(() => {
    const markers = Object.values(savedPlaces).map((p) => ({
      lat: p.lat,
      lon: p.lon,
      title: p.title.replace(/[\\`$]/g, ''),
    }));
    return buildHtml(markers, theme.isDark);
  }, [savedPlaces, theme.isDark]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});

import { Linking, Alert, Platform } from 'react-native';
import type { TravelMode } from '../state/AppProvider';
import type { Region } from './region';
import { t } from '../i18n';

type NavApp = {
  id: string;
  label: string;
  appUrl: (lat: number, lon: number, mode: TravelMode) => string;
  webUrl: (lat: number, lon: number, mode: TravelMode) => string;
};

const NAV_APPS: NavApp[] = [
  {
    id: 'google',
    label: 'Google Maps',
    appUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'w' : 'd';
      return Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${lat},${lon}&directionsmode=${m === 'w' ? 'walking' : 'driving'}`
        : `google.navigation:q=${lat},${lon}&mode=${m}`;
    },
    webUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'walking' : 'driving';
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${m}`;
    },
  },
  {
    id: 'yandex',
    label: 'Яндекс Карты',
    appUrl: (lat, lon) => `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`,
    webUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'pd' : 'auto';
      return `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=${m}`;
    },
  },
  {
    id: 'amap',
    label: 'Amap (高德地图)',
    appUrl: (lat, lon, mode) => {
      const t = mode === 'walk' ? 2 : 0;
      return `androidamap://route?sourceApplication=nearestspot&dlat=${lat}&dlon=${lon}&dname=dest&dev=0&t=${t}`;
    },
    webUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 2 : 0;
      return `https://uri.amap.com/navigation?to=${lon},${lat}&mode=${m}&policy=1`;
    },
  },
  {
    id: 'baidu',
    label: 'Baidu Maps (百度地图)',
    appUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'walking' : 'driving';
      return `baidumap://map/direction?destination=latlng:${lat},${lon}|name:dest&mode=${m}&coord_type=gcj02`;
    },
    webUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'walking' : 'driving';
      return `https://api.map.baidu.com/direction?destination=latlng:${lat},${lon}|name=dest&mode=${m}&coord_type=gcj02&output=html`;
    },
  },
];

async function openNavApp(app: NavApp, lat: number, lon: number, mode: TravelMode): Promise<void> {
  try {
    await Linking.openURL(app.appUrl(lat, lon, mode));
    return;
  } catch {
    // app not installed, fall back to web
  }
  await Linking.openURL(app.webUrl(lat, lon, mode)).catch(() => {});
}

export function openNavigationPicker(
  lat: number,
  lon: number,
  travelMode: TravelMode,
  region: Region,
): void {
  const sorted = [...NAV_APPS].sort((a, b) => {
    if (region === 'china') {
      if (a.id === 'amap') return -1;
      if (b.id === 'amap') return 1;
      if (a.id === 'baidu') return -1;
      if (b.id === 'baidu') return 1;
    }
    if (region === 'russia') {
      if (a.id === 'yandex') return -1;
      if (b.id === 'yandex') return 1;
    }
    if (a.id === 'google') return -1;
    if (b.id === 'google') return 1;
    return 0;
  });

  const buttons = sorted.map((app) => ({
    text: app.label,
    onPress: () => {
      void openNavApp(app, lat, lon, travelMode);
    },
  }));

  Alert.alert(t('nav_title'), t('nav_message'), [
    ...buttons,
    { text: t('cancel'), style: 'cancel' },
  ]);
}

import { Linking, Alert } from 'react-native';
import type { TravelMode } from '../state/AppProvider';
import type { Region } from './region';

type NavApp = {
  id: string;
  label: string;
  scheme: string;
  buildUrl: (lat: number, lon: number, mode: TravelMode) => string;
};

const NAV_APPS: NavApp[] = [
  {
    id: 'google',
    label: 'Google Maps',
    scheme: 'comgooglemaps://',
    buildUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'walking' : 'driving';
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${m}`;
    },
  },
  {
    id: 'yandex',
    label: 'Яндекс Карты',
    scheme: 'yandexmaps://',
    buildUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'pd' : 'auto';
      return `yandexmaps://maps.yandex.ru/?rtext=~${lat},${lon}&rtt=${m}`;
    },
  },
  {
    id: 'amap',
    label: 'Amap (高德地图)',
    scheme: 'iosamap://',
    buildUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 2 : 0;
      return `https://uri.amap.com/navigation?to=${lon},${lat}&mode=${m}&policy=1`;
    },
  },
  {
    id: 'baidu',
    label: 'Baidu Maps (百度地图)',
    scheme: 'baidumap://',
    buildUrl: (lat, lon, mode) => {
      const m = mode === 'walk' ? 'walking' : 'driving';
      return `http://api.map.baidu.com/direction?destination=latlng:${lat},${lon}|name=dest&mode=${m}&coord_type=gcj02&output=html`;
    },
  },
];

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
      const url = app.buildUrl(lat, lon, travelMode);
      Linking.openURL(url).catch(() => {
        Linking.openURL(app.buildUrl(lat, lon, travelMode)).catch(() => {});
      });
    },
  }));

  Alert.alert('Построить маршрут', 'Выберите навигатор', [
    ...buttons,
    { text: 'Отмена', style: 'cancel' },
  ]);
}

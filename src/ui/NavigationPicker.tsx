import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TravelMode } from '../state/AppProvider';
import type { Region } from '../services/region';
import { t } from '../i18n';
import { useTheme, type Theme } from './theme';

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

function sortNavApps(region: Region): NavApp[] {
  return [...NAV_APPS].sort((a, b) => {
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
}

type PickerState = {
  lat: number;
  lon: number;
  mode: TravelMode;
  region: Region;
};

let showListener: ((state: PickerState) => void) | null = null;

export function openNavigationPicker(
  lat: number,
  lon: number,
  travelMode: TravelMode,
  region: Region,
): void {
  showListener?.({ lat, lon, mode: travelMode, region });
}

export function NavigationPickerHost() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [state, setState] = useState<PickerState | null>(null);

  useEffect(() => {
    showListener = setState;
    return () => {
      showListener = null;
    };
  }, []);

  const close = () => setState(null);
  const apps = state ? sortNavApps(state.region) : [];

  return (
    <Modal
      visible={state !== null}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t('nav_title')}</Text>
          <Text style={styles.message}>{t('nav_message')}</Text>
          {apps.map((app) => (
            <Pressable
              key={app.id}
              style={styles.option}
              onPress={() => {
                if (!state) return;
                close();
                void openNavApp(app, state.lat, state.lon, state.mode);
              }}
            >
              <Text style={styles.optionText}>{app.label}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.option, styles.cancel]} onPress={close}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: theme.bg,
      borderRadius: 16,
      padding: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    message: {
      marginTop: 4,
      marginBottom: 12,
      fontSize: 14,
      color: theme.textMuted,
    },
    option: {
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    optionText: {
      fontSize: 16,
      color: theme.text,
    },
    cancel: {
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textMuted,
    },
  });
}

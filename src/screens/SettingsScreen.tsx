import { Linking, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useApp } from '../state/AppProvider';
import { PrimaryButton } from '../ui/PrimaryButton';
import { MOCK_LOCATIONS } from '../constants/mockLocations';
import { WIKI_LANG_OPTIONS } from '../services/wikipedia';
import { detectRegion, getRegionInfo } from '../services/region';
import type { Region } from '../services/region';
import { useTheme, type Theme } from '../ui/theme';
import { t, type UILocaleSetting } from '../i18n';

const DONATE_URL = 'https://boosty.to/nearestspot';

const UI_LOCALE_OPTIONS: { value: UILocaleSetting; label: string }[] = [
  { value: 'auto', label: '' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

const REGION_OPTIONS: { value: Region | 'auto'; label: string }[] = [
  { value: 'auto', label: t('auto') },
  { value: 'china', label: '中国 China' },
  { value: 'russia', label: 'Россия' },
  { value: 'japan', label: '日本 Japan' },
  { value: 'europe', label: 'Europe' },
  { value: 'americas', label: 'Americas' },
  { value: 'other', label: t('region_other') },
];

export function SettingsScreen() {
  const { settings, setSettings, resetSeen, refreshLocation, locationOverride, setLocationOverride, location } =
    useApp();
  const [customRadius, setCustomRadius] = useState('');
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const detectedRegion =
    location.status === 'granted' ? detectRegion(location.coords.lat, location.coords.lon) : null;
  const activeRegion = settings.regionOverride === 'auto' ? detectedRegion : settings.regionOverride;
  const regionInfo = activeRegion ? getRegionInfo(activeRegion) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_theme')}</Text>
        <View style={styles.row}>
          <PrimaryButton
            title={t('theme_light')}
            variant={settings.theme === 'light' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, theme: 'light' }))}
          />
          <PrimaryButton
            title={t('theme_dark')}
            variant={settings.theme === 'dark' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, theme: 'dark' }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_ui_lang')}</Text>
        <View style={styles.row}>
          {UI_LOCALE_OPTIONS.map((opt) => (
            <PrimaryButton
              key={opt.value}
              title={opt.value === 'auto' ? t('auto') : opt.label}
              variant={settings.uiLocale === opt.value ? 'primary' : 'secondary'}
              onPress={() => setSettings((s) => ({ ...s, uiLocale: opt.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>{t('settings_ui_lang_hint')}</Text>
      </View>

      {regionInfo && (
        <View style={styles.section}>
          <Text style={styles.h}>
            {t('settings_region')}: {regionInfo.label} {regionInfo.labelLocal}
          </Text>
          <Text style={styles.sub}>
            {settings.regionOverride === 'auto'
              ? t('settings_region_detected')
              : t('settings_region_manual')}
          </Text>
          <Text style={styles.sub}>{t('settings_providers')}: {regionInfo.primaryProviders.join(', ')}</Text>
          {activeRegion === 'china' && (
            <Text style={styles.tip}>{regionInfo.tip}</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_location')}</Text>
        <View style={styles.row}>
          <PrimaryButton
            title={t('btn_current')}
            variant={locationOverride.kind === 'none' ? 'primary' : 'secondary'}
            onPress={async () => {
              setLocationOverride({ kind: 'none' });
              await refreshLocation();
            }}
          />
          {MOCK_LOCATIONS.map((m) => (
            <PrimaryButton
              key={m.id}
              title={m.title}
              variant={locationOverride.kind === 'mock' && locationOverride.mock.id === m.id ? 'primary' : 'secondary'}
              onPress={() => setLocationOverride({ kind: 'mock', mock: m })}
            />
          ))}
        </View>
        <Text style={styles.sub}>{t('settings_location_hint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_region')}</Text>
        <View style={styles.row}>
          {REGION_OPTIONS.map((opt) => (
            <PrimaryButton
              key={opt.value}
              title={opt.label}
              variant={settings.regionOverride === opt.value ? 'primary' : 'secondary'}
              onPress={() => setSettings((s) => ({ ...s, regionOverride: opt.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>{t('settings_region_hint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_amap_key')}</Text>
        <TextInput
          style={styles.input}
          value={settings.amapKey}
          onChangeText={(v) => setSettings((s) => ({ ...s, amapKey: v.trim() }))}
          placeholder={t('settings_amap_placeholder')}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.sub}>
          {t('settings_amap_hint')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_google_key')}</Text>
        <TextInput
          style={styles.input}
          value={settings.googleKey}
          onChangeText={(v) => setSettings((s) => ({ ...s, googleKey: v.trim() }))}
          placeholder="AIza..."
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.sub}>
          {t('settings_google_hint')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_radius')}</Text>
        <View style={styles.row}>
          <PrimaryButton
            title="1 км"
            variant={settings.radiusMeters === 1000 ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, radiusMeters: 1000 }))}
          />
          <PrimaryButton
            title="3 км"
            variant={settings.radiusMeters === 3000 ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, radiusMeters: 3000 }))}
          />
          <PrimaryButton
            title="10 км"
            variant={settings.radiusMeters === 10000 ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, radiusMeters: 10000 }))}
          />
          <PrimaryButton
            title="25 км"
            variant={settings.radiusMeters === 25000 ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, radiusMeters: 25000 }))}
          />
          <PrimaryButton
            title="100 км"
            variant={settings.radiusMeters === 100000 ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, radiusMeters: 100000 }))}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="decimal-pad"
            placeholder={t('settings_custom_radius_placeholder')}
            placeholderTextColor="#9CA3AF"
            value={customRadius}
            onChangeText={setCustomRadius}
            onSubmitEditing={() => {
              const km = parseFloat(customRadius.replace(',', '.'));
              const m = Math.round(km * 1000);
              if (m >= 100 && m <= 100000) {
                setSettings((s) => ({ ...s, radiusMeters: m }));
              }
            }}
          />
          <PrimaryButton
            title="OK"
            onPress={() => {
              const km = parseFloat(customRadius.replace(',', '.'));
              const m = Math.round(km * 1000);
              if (m >= 100 && m <= 100000) {
                setSettings((s) => ({ ...s, radiusMeters: m }));
              }
            }}
          />
        </View>
        <Text style={styles.sub}>{t('settings_radius_hint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_mode')}</Text>
        <View style={styles.row}>
          <PrimaryButton
            title={t('mode_walk')}
            variant={settings.travelMode === 'walk' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, travelMode: 'walk' }))}
          />
          <PrimaryButton
            title={t('mode_drive')}
            variant={settings.travelMode === 'drive' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, travelMode: 'drive' }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_wiki_lang')}</Text>
        <View style={styles.row}>
          {WIKI_LANG_OPTIONS.map((opt) => (
            <PrimaryButton
              key={opt.value}
              title={opt.value === 'auto' ? t('auto') : opt.label}
              variant={settings.wikiLang === opt.value ? 'primary' : 'secondary'}
              onPress={() => setSettings((s) => ({ ...s, wikiLang: opt.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>{t('settings_wiki_lang_hint')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.h}>{t('settings_require_image')}</Text>
            <Text style={styles.sub}>{t('settings_require_image_hint')}</Text>
          </View>
          <Switch
            value={settings.requireImage}
            onValueChange={(v) => setSettings((s) => ({ ...s, requireImage: v }))}
          />
        </View>
      </View>

      <View style={[styles.section, styles.buttonGroup]}>
        <PrimaryButton title={t('settings_reset_seen')} variant="secondary" onPress={resetSeen} />
        <PrimaryButton title={t('settings_refresh_location')} variant="secondary" onPress={refreshLocation} />
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>{t('settings_donate')}</Text>
        <Text style={styles.sub}>{t('settings_donate_hint')}</Text>
        <PrimaryButton
          title={t('settings_donate_btn')}
          variant="secondary"
          onPress={() => {
            void Linking.openURL(DONATE_URL).catch(() => {});
          }}
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 40 },
    section: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: t.card,
      marginBottom: 16,
    },
    h: { fontSize: 16, fontWeight: '800', color: t.text },
    sub: { fontSize: 13, color: t.textMuted, marginBottom: 4 },
    tip: { fontSize: 13, color: '#B45309', fontWeight: '500' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    buttonGroup: { gap: 10 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    switchText: { flex: 1, gap: 4 },
    input: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 10,
      fontSize: 14,
      color: t.text,
      backgroundColor: t.inputBg,
    },
  });

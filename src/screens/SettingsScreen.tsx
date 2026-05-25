import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useApp } from '../state/AppProvider';
import { PrimaryButton } from '../ui/PrimaryButton';
import { MOCK_LOCATIONS } from '../constants/mockLocations';
import { WIKI_LANG_OPTIONS } from '../services/wikipedia';
import { detectRegion, getRegionInfo } from '../services/region';
import type { Region } from '../services/region';

const REGION_OPTIONS: { value: Region | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'china', label: '中国 China' },
  { value: 'russia', label: 'Россия' },
  { value: 'japan', label: '日本 Japan' },
  { value: 'europe', label: 'Europe' },
  { value: 'americas', label: 'Americas' },
  { value: 'other', label: 'Другой' },
];

export function SettingsScreen() {
  const { settings, setSettings, resetSeen, refreshLocation, locationOverride, setLocationOverride, location } =
    useApp();
  const [customRadius, setCustomRadius] = useState('');

  const detectedRegion =
    location.status === 'granted' ? detectRegion(location.coords.lat, location.coords.lon) : null;
  const activeRegion = settings.regionOverride === 'auto' ? detectedRegion : settings.regionOverride;
  const regionInfo = activeRegion ? getRegionInfo(activeRegion) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {regionInfo && (
        <View style={styles.section}>
          <Text style={styles.h}>
            Регион: {regionInfo.label} {regionInfo.labelLocal}
          </Text>
          <Text style={styles.sub}>
            {settings.regionOverride === 'auto'
              ? `Определён автоматически по координатам`
              : `Установлен вручную`}
          </Text>
          <Text style={styles.sub}>Провайдеры: {regionInfo.primaryProviders.join(', ')}</Text>
          {activeRegion === 'china' && (
            <Text style={styles.tip}>{regionInfo.tip}</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.h}>Локация</Text>
        <View style={styles.row}>
          <PrimaryButton
            title="Текущая"
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
        <Text style={styles.sub}>Если геолокация не даётся (особенно в web), выбери мок.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Регион</Text>
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
        <Text style={styles.sub}>Авто — определяет по координатам. В Китае автоматически использует Amap и Baidu.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Amap API ключ</Text>
        <TextInput
          style={styles.input}
          value={settings.amapKey}
          onChangeText={(v) => setSettings((s) => ({ ...s, amapKey: v.trim() }))}
          placeholder="Вставь ключ с lbs.amap.com"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.sub}>
          Бесплатный ключ для 高德地图 (Amap). Регистрация на lbs.amap.com → Web Services API. Без ключа Amap не работает.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Google Places API ключ</Text>
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
          Google Places API — ищет достопримечательности с фото. Бесплатно до 5000 запросов/день. console.cloud.google.com → Places API.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Радиус</Text>
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
            placeholder="Свой радиус (км)"
            placeholderTextColor="#9CA3AF"
            value={customRadius}
            onChangeText={setCustomRadius}
            onSubmitEditing={() => {
              const km = parseFloat(customRadius.replace(',', '.'));
              const m = Math.round(km * 1000);
              if (m >= 100 && m <= 500000) {
                setSettings((s) => ({ ...s, radiusMeters: m }));
              }
            }}
          />
          <PrimaryButton
            title="OK"
            onPress={() => {
              const km = parseFloat(customRadius.replace(',', '.'));
              const m = Math.round(km * 1000);
              if (m >= 100 && m <= 500000) {
                setSettings((s) => ({ ...s, radiusMeters: m }));
              }
            }}
          />
        </View>
        <Text style={styles.sub}>Wikipedia: макс 10 км. Google/Amap: до 500 км.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Режим</Text>
        <View style={styles.row}>
          <PrimaryButton
            title="Пешком"
            variant={settings.travelMode === 'walk' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, travelMode: 'walk' }))}
          />
          <PrimaryButton
            title="На авто"
            variant={settings.travelMode === 'drive' ? 'primary' : 'secondary'}
            onPress={() => setSettings((s) => ({ ...s, travelMode: 'drive' }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h}>Язык Wikipedia</Text>
        <View style={styles.row}>
          {WIKI_LANG_OPTIONS.map((opt) => (
            <PrimaryButton
              key={opt.value}
              title={opt.label}
              variant={settings.wikiLang === opt.value ? 'primary' : 'secondary'}
              onPress={() => setSettings((s) => ({ ...s, wikiLang: opt.value }))}
            />
          ))}
        </View>
        <Text style={styles.sub}>Авто — определяет по языку устройства. Если нет результатов, пробует другие языки.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.h}>Только с фото</Text>
            <Text style={styles.sub}>Убирает выдачу без картинок</Text>
          </View>
          <Switch
            value={settings.requireImage}
            onValueChange={(v) => setSettings((s) => ({ ...s, requireImage: v }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <PrimaryButton title="Сбросить просмотренное" variant="secondary" onPress={resetSeen} />
        <PrimaryButton title="Обновить геолокацию" variant="secondary" onPress={refreshLocation} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  h: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  tip: { fontSize: 13, color: '#B45309', fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { flex: 1, gap: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

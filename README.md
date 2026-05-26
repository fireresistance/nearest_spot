# NearestSpot

Мобильное приложение для поиска интересных мест рядом с текущей геолокацией. Tinder-подобный интерфейс: свайпай карточки, сохраняй понравившиеся, строй маршрут.

**Версия:** 1.3.0  
**Стек:** Expo SDK 54 / React Native 0.81.5 / TypeScript / New Architecture (Fabric + Bridgeless)  
**Платформы:** Android (iOS — не тестировалась)

---

## Статус проекта

### Работает
- Геолокация с автообновлением (5 мин stale-таймаут)
- Поиск мест через Wikipedia API (10 языков) и OpenStreetMap Overpass API (фолбэк)
- **Мультизапросы для больших радиусов** — Wikipedia/OSM API с лимитом 10 км автоматически разбиваются на сетку подзапросов, покрывающих весь радиус до 500 км
- Региональная специфика: Amap (高德地图) и Baidu Baike (百度百科) для Китая
- Google Places API (если задан ключ) — приоритетный источник с фото
- Автоопределение региона по координатам (Китай, Россия, Япония, Европа, Америка)
- Фильтрация «скучных» объектов (остановки, метро, парковки, магазины и т.д.)
- **Каскад поиска картинок:** Baidu Baike HTML-парсинг → Wikipedia Thumbnail → Wikimedia Commons → Openverse
- **Выбор навигатора** при построении маршрута: Google Maps, Яндекс Карты, Amap, Baidu Maps (сортировка по региону)
- Свайп-карточки (влево/вправо для «дальше»)
- Индикатор загрузки фотографии в карточке места
- Префетч: подгрузка следующих мест заранее (порог 15)
- Сохранение мест в избранное
- Радиус поиска до 500 км (Google/Amap — нативно, Wikipedia/OSM — через мультизапросы)
- Настройки: радиус (км), режим (пешком/авто), язык Wikipedia, «только с фото», API ключи, регион

### Известные проблемы
- **Google Maps может быть недоступен** в некоторых регионах
- **Edge-to-edge отключён** (`edgeToEdgeEnabled: false`) — в Android 16+ потребуется фикс от Expo
- **Amap/Google требуют API ключи** — без ключей используются Wikipedia/OSM

---

## Архитектура

```
App.tsx
 └─ AppProvider (контекст + стейт)
     └─ RootNavigator (таб-навигация)
         ├─ NearbyTab → NearbyStack
         │   ├─ NearbyScreen (свайп-лента + логика загрузки)
         │   └─ PlaceDetailsScreen
         ├─ SavedTab → SavedStack
         │   ├─ SavedScreen (список сохранённых)
         │   └─ PlaceDetailsScreen
         └─ SettingsTab → SettingsScreen (настройки)
```

### Структура директорий

```
src/
  services/              # API-клиенты
    wikipedia.ts         # Wikipedia GeoSearch API (generator=geosearch, мультизапросы для radius>10km)
                         # Экспортирует BORING_PATTERNS и isBoring()
    osm.ts               # OpenStreetMap Overpass API (фолбэк, 3 сервера, мультизапросы для radius>10km)
    amap.ts              # 高德地图 Amap POI Search API (для Китая, требует API ключ, до 500км)
    baiduImage.ts        # 百度百科 HTML-парсинг для картинок (bkimg.cdn.bcebos.com)
    baidu.ts             # 百度百科 Baidu Baike API (обогащение описаний в Китае)
    google.ts            # Google Places API + Photo API (требует API ключ, до 500км)
    region.ts            # Определение региона по координатам
    imageSearch.ts       # Каскад поиска картинок: Baidu Baike → Wikipedia Thumbnail → WM Commons → Openverse
    imageProxy.ts        # Проксирование URL картинок для Китая (WMF → zh.wikipedia.org)
    coverGrid.ts         # Генерация сетки точек покрытия для мультизапросов (Haversine)
    navigation.ts        # Выбор навигатора: Google Maps, Yandex, Amap, Baidu Maps
  state/                 # Глобальный стейт
    AppProvider.tsx      # React Context: локация, настройки, сохранённые, просмотренные
    storage.ts           # AsyncStorage обёртка (readJson/writeJson)
    locationOverride.ts  # Тип для мок-локации
  screens/               # Экраны
    NearbyScreen.tsx     # Главная лента со свайпами + цепочка источников данных
    SavedScreen.tsx      # Список сохранённых мест
    PlaceDetailsScreen.tsx   # Детали места (фото, описание, кнопки)
    SettingsScreen.tsx   # Настройки
  ui/                    # Реюзабельные компоненты
    PlaceCard.tsx        # Карточка места (lazy-загрузка фото со спиннером, плейсхолдер при ошибке)
    PrimaryButton.tsx    # Кнопка (primary/secondary)
  navigation/
    RootNavigator.tsx    # BottomTabs + NativeStack
  types/
    place.ts             # Тип Place (source: wikipedia | osm | amap | baidu)
  constants/
    mockLocations.ts     # Предустановленные мок-локации (Москва, СПб, Париж, NYC, Tokyo, Шанхай, Пекин)
  utils/
    geo.ts               # Haversine, форматирование расстояния/ETA
```

---

## Логика работы

### 1. Геолокация

**Файл:** `src/state/AppProvider.tsx` → `refreshLocation()`

1. Если включена мок-локация → используется она
2. Проверяется разрешение `ACCESS_FINE_LOCATION`
3. Вызывается `Location.getLastKnownPositionAsync()` — мгновенная кэшированная позиция
4. Если позиция старше **5 минут** или отсутствует → запускается `watchPositionAsync` на 15 сек
5. Если `watchPositionAsync` таймаутится, но кэш есть → используется кэш
6. Если нет ничего → статус `denied`

> `getCurrentPositionAsync` зависает на некоторых Xiaomi/MIUI устройствах. Комбинация `getLastKnownPositionAsync` + `watchPositionAsync` даёт баланс скорости и актуальности.

---

### 2. Поиск мест

**Файл:** `src/screens/NearbyScreen.tsx` → `loadMore()`

Каскадная цепочка источников — следующий используется только если предыдущий вернул 0 результатов:

```
Google Places API  (если задан googleKey, до 500км)
       ↓ нет результатов
Amap POI Search    (если регион=Китай и задан amapKey, до 500км)
  + Baidu Baike enrichment (фото через HTML-парсинг)
       ↓ нет результатов
Wikipedia GeoSearch  (до 3 языков × 2 хоста, мультизапросы для radius>10км)
       ↓ нет результатов
OSM Overpass API   (3 сервера, 20 сек таймаут, мультизапросы для radius>10км)
```

После загрузки из любого источника — **каскад обогащения картинками**:

```
1. Baidu Baike HTML-парсинг  (только Китай, до 5 мест без картинки)
       ↓
2. Wikipedia Thumbnail       (из pageimages prop, все языки)
       ↓
3. Wikimedia Commons Search  (без API ключа, до 8 мест без картинки)
       ↓
4. Openverse API             (без API ключа, Creative Commons фото)
```

Если включена опция «Только с фото» — после обогащения фильтруются места без `thumbnailUrl`.

**Префетч:** когда в очереди < 15 мест, автоматически вызывается `loadMore`.

---

### 3. Фильтрация скучных мест

**Файл:** `src/services/wikipedia.ts` → `isBoring(title)`, `BORING_PATTERNS`

Фильтруются (на русском, английском и китайском):
- Транзит: метро, станции, вокзалы, платформы, трамвайные/автобусные/троллейбусные остановки, маршрутки
- Парковки и стоянки
- Заправки (АЗС)
- Банки и банкоматы
- Больницы, клиники, аптеки
- Магазины, супермаркеты, торговые центры
- Туалеты, почтовые отделения
- Школы, детские сады
- Жилые дома, офисные здания, склады, промышленные объекты

---

### 4. Wikipedia API

**Файл:** `src/services/wikipedia.ts`

- Использует `generator=geosearch` — **один запрос** вместо двух (геопоиск + детали вместе)
- Пробует до 3 языков (auto → локаль устройства → fallback en/ru/zh)
- Для каждого языка пробует 2 хоста: `xx.wikipedia.org` и `xx.m.wikipedia.org`
- Таймаут 15 сек, использует `XMLHttpRequest` (не `fetch` — см. раздел «Ключевые решения»)
- Размер превью: **500px**
- ID мест: `{lang}:{pageid}`

**Мультизапросы для больших радиусов:**

Wikipedia API ограничивает радиус геопоиска до 10 км. Для покрытия больших областей:

1. `coverGrid.ts` генерирует сетку точек с шагом 15 км (1.5 × subRadius), покрывающую весь круг
2. Точки за пределами запрошенного радиуса отсекаются (Haversine)
3. Максимум 12 точек — если сетка больше, лишние точки выбираются случайно
4. Запросы выполняются батчами по 3 параллельно (`Promise.allSettled`)
5. Результаты дедуплицируются по ID места
6. Ранняя остановка если набрано `limit × 2` мест

Пример: радиус 100 км → ~7 подзапросов по 10 км, радиус 500 км → ~12 подзапросов.

---

### 5. Каскад поиска картинок

**Файл:** `src/services/imageSearch.ts`

Четыре источника, все **без API ключа**:

1. **Baidu Baike HTML-парсинг** (`src/services/baiduImage.ts`)
   - Парсит HTML-страницу `baike.baidu.com/item/{title}` через XHR
   - Извлекает изображения с `bkimg.cdn.bcebos.com` (CDN Baidu)
   - Устанавливает `Referer: https://baike.baidu.com` для доступа к CDN
   - Используется только для китайских названий

2. **Wikipedia Thumbnail** — `xx.wikipedia.org/w/api.php`
   - Получает thumbnail из `pageimages` prop при поиске мест
   - Работает для ru/en и других языков

3. **Wikimedia Commons** — `commons.wikimedia.org/w/api.php`
   - Ищет изображения по названию места
   - Возвращает `thumburl` (600px превью)

4. **Openverse** — `api.openverse.org/v1/images/`
   - Поиск Creative Commons изображений
   - Бесплатный, без API ключа (rate-limited)
   - Приоритет: прямые URL изображений вместо прокси (прокси возвращает 424)

Функция `enrichPlacesWithImages()` параллельно обогащает места без картинок через каскад.

**Проксирование для Китая** (`src/services/imageProxy.ts`):
- Wikimedia Commons заблокирован в Китае
- URL перенаправляются через `zh.wikipedia.org` (доступен)
- Baidu Baike CDN требует правильный `Referer` заголовок

---

### 6. Карточка места

**Файл:** `src/ui/PlaceCard.tsx`

Состояния фотографии:
1. **Загрузка** (`thumbnailUrl` есть, `imgLoaded = false`) → `ActivityIndicator`
2. **Загружена** (`imgLoaded = true`) → фото
3. **Ошибка** (`imgError = true`) → плейсхолдер с 📍
4. **Нет фото** (`thumbnailUrl` отсутствует) → плейсхолдер с 📍

При загрузке Image передаются заголовки `Referer` и `User-Agent` — без них Wikipedia/WMF может вернуть 403 на загрузку изображения.

---

### 7. Навигация

**Файл:** `src/services/navigation.ts`

При нажатии «Построить маршрут» появляется Alert с выбором навигатора:

| Навигатор | URL-шаблон | Примечание |
|-----------|-----------|------------|
| Google Maps | `google.navigation:q={lat},{lon}&mode={mode}` | По умолчанию для всех регионов |
| Яндекс Карты | `yandexnavi://build_route_on_map?lat_to={lat}&lon_to={lon}` | Первый в России |
| Amap (高德) | `androidamap://route?lat={lat}&lon={lon}&dev=0` | Первый в Китае |
| Baidu Maps | `baidumap://map/direction?destination={lat},{lon}` | Второй в Китае |

Порядок кнопок зависит от региона:
- **Китай:** Amap → Baidu → Google → Yandex
- **Россия:** Yandex → Google → Amap → Baidu
- **Другие:** Google → Yandex → Amap → Baidu

---

### 8. Хранение данных

**Файл:** `src/state/storage.ts` — `AsyncStorage` с версионированными ключами:

| Ключ | Тип | Содержимое |
|------|-----|------------|
| `settings.v2` | `Settings` | radius, travelMode, requireImage, wikiLang, amapKey, googleKey, regionOverride |
| `seen.v1` | `string[]` | ID просмотренных мест |
| `saved.v1` | `Record<string, Place>` | Сохранённые места (полные объекты) |
| `locationOverride.v1` | `LocationOverride` | Мок-локация |

---

### 9. Управление состоянием загрузки в NearbyScreen

**Файл:** `src/screens/NearbyScreen.tsx`

`loadMore()` защищена тремя guard-проверками в начале:

```typescript
if (!canLoad) return;        // нет геолокации или разрешения
if (exhaustedRef.current) return;  // все источники исчерпаны
if (loadingRef.current) return;    // уже идёт загрузка
```

`exhaustedRef` и `loadingRef` — синхронные `useRef`, а не `useState`, чтобы проверки срабатывали немедленно без ре-рендера и не было race condition.

При нажатии «Обновить» нужно сбросить `exhaustedRef` **до** вызова `loadMore`, иначе она вернётся сразу:

```typescript
onPress={async () => {
  setExhaustedBoth(false);        // сбрасывает exhaustedRef.current + state
  setQueue([]);
  queueIdsRef.current.clear();    // дедупликация тоже сбрасывается
  await refreshLocation();
  void loadMoreRef.current();     // ref, а не прямой вызов — берём свежую замыкание
}}
```

`loadMoreRef` хранит актуальную версию `loadMore` (обновляется через `useEffect`), чтобы не поймать устаревшее замыкание.

---

## Разработка

### Требования

- Node.js 20.x (v24 вызывает краш Gradle при сборке — не использовать)
- Android SDK (compileSdk 36, buildTools 36.0.0, NDK 27.1.12297006)
- Java 17
- ADB — для установки APK и отладки

**Путь к Android SDK на этой машине:** `C:\Android\sdk`  
**Путь к ADB:** `C:\Android\sdk\platform-tools\adb.exe`

### Установка зависимостей

```bash
npm install
```

### Тесты

```bash
npx jest                    # unit-тесты
INTEGRATION=1 npx jest      # + интеграционные (реальные API-вызовы, нужна сеть)
```

> Тесты в `__tests__/wikipedia.test.ts` мокают `global.fetch`, но сервис использует XHR — тесты устарели и не покрывают реальный код-путь.

---

## Сборка и деплой

### Два режима работы приложения

| Режим | Как собрать | Требует Metro | Когда использовать |
|-------|-------------|---------------|-------------------|
| **Release APK** | `gradlew assembleRelease` | Нет — бандл вшит в APK | Деплой пользователю |
| **Debug (dev)** | `npx expo run:android` | Да — порт 8081 | Разработка и отладка |

> **Release APK** — правильный вариант для постоянного использования. Debug-билд требует, чтобы на компьютере был запущен Metro-бандлер, иначе приложение покажет красный экран «Unable to load script».

---

### Где взять ADB

ADB — часть Android SDK Platform Tools. Путь на этой машине:

```
C:\Android\sdk\platform-tools\adb.exe
```

Если нет — скачать отдельно: https://developer.android.com/tools/releases/platform-tools

Проверить подключение:
```powershell
& "C:\Android\sdk\platform-tools\adb.exe" devices
```

Должно показать:
```
List of devices attached
XXXXXXXX    device
```

Если показывает `unauthorized` — на телефоне нужно подтвердить отладку по USB.

### Включение отладки по USB на телефоне

1. Настройки → О телефоне → Нажать 7 раз на «Номер сборки»
2. Настройки → Для разработчиков → Включить «Отладка по USB»
3. Подключить телефон по USB
4. Подтвердить «Разрешить отладку» на телефоне

---

### Сборка release APK (рекомендуется)

Release APK содержит вшитый JS-бандл и не требует Metro. Подписывается debug-кейстором (для личного использования достаточно).

```powershell
$env:ANDROID_HOME = "C:\Android\sdk"
cd Z:\projects\NearestSpot\android
.\gradlew.bat assembleRelease
```

Gradle сам запустит `npx expo export:embed` для бандлинга JS. Занимает 5–10 минут при первой сборке, потом быстрее.

APK появится здесь:
```
android\app\build\outputs\apk\release\app-release.apk
```

### Установка APK на телефон

```powershell
& "C:\Android\sdk\platform-tools\adb.exe" install -r "Z:\projects\NearestSpot\android\app\build\outputs\apk\release\app-release.apk"
```

Флаг `-r` — заменить существующую версию (обновление без удаления данных).

### Запуск / перезапуск приложения

```powershell
# Запустить
& "C:\Android\sdk\platform-tools\adb.exe" shell am start -n com.nearestspot.app/.MainActivity

# Перезапустить
& "C:\Android\sdk\platform-tools\adb.exe" shell am force-stop com.nearestspot.app
& "C:\Android\sdk\platform-tools\adb.exe" shell am start -n com.nearestspot.app/.MainActivity
```

---

## Отладка

### Вариант 1: Dev-режим с Metro (полная отладка)

Даёт `console.log` в терминале, hot reload, React DevTools.

```powershell
# 1. Пробросить порт (телефон → компьютер через USB)
& "C:\Android\sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081

# 2. Запустить Metro-бандлер
$env:ANDROID_HOME = "C:\Android\sdk"
cd Z:\projects\NearestSpot
npx expo start --port 8081

# 3. Собрать и установить debug-билд (только при первом запуске или изменении нативного кода)
npx expo run:android

# 4. Запустить приложение
& "C:\Android\sdk\platform-tools\adb.exe" shell am start -n com.nearestspot.app/.MainActivity
```

Пока Metro запущен, логи из `console.log` появляются прямо в терминале. Изменения в JS подхватываются без пересборки.

> **Важно:** если Metro остановить, а потом открыть приложение — будет красный экран «Unable to load script». Нужно снова запустить Metro и перезапустить приложение.

### Вариант 2: Logcat (для release APK)

Release APK не выводит `console.log`. Используй logcat для низкоуровневых ошибок:

```powershell
# Очистить буфер и начать слушать
& "C:\Android\sdk\platform-tools\adb.exe" logcat -c
& "C:\Android\sdk\platform-tools\adb.exe" logcat

# Только React Native JS логи
& "C:\Android\sdk\platform-tools\adb.exe" logcat -s ReactNativeJS

# Ошибки React Native
& "C:\Android\sdk\platform-tools\adb.exe" logcat | Select-String "ReactNativeJS|JavascriptException|ReactNative"

# Логи только нашего процесса
$appPid = & "C:\Android\sdk\platform-tools\adb.exe" shell "pidof com.nearestspot.app"
& "C:\Android\sdk\platform-tools\adb.exe" logcat --pid=$appPid
```

### Вариант 3: Alert в коде

Добавить временно в нужное место:

```typescript
import { Alert } from 'react-native';
Alert.alert('DEBUG', JSON.stringify(someValue, null, 2));
```

Появится всплывающее окно прямо на экране телефона — работает и в release APK.

---

### Типичные ошибки и их причины

#### Красный экран «Unable to load script»
**Причина:** Приложение собрано в debug-режиме, а Metro не запущен.  
**Решение:** Запустить Metro (`npx expo start`) + `adb reverse tcp:8081 tcp:8081`, либо пересобрать release APK.

#### Красный экран «Cannot find native module 'ExponentImagePicker'»
**Причина:** Устаревший кэш Metro-бандлера содержит мусор от предыдущих сессий.  
**Решение:** Сбросить кэш Metro:
```powershell
npx expo start --clear
```
Или пересобрать release APK — там кэша нет.

#### `adb: command not found` / путь к ADB
**Причина:** ADB не в PATH.  
**Решение:** Использовать полный путь `C:\Android\sdk\platform-tools\adb.exe` или добавить в PATH.

#### Краш Gradle при сборке на Node.js v24
**Причина:** Несовместимость Gradle с Node.js v24.  
**Решение:** Использовать Node.js v20.x.

#### Приложение не загружает места (показывает «Нет подходящих мест»)
**Причина:** Все ближайшие места уже были показаны ранее (они в `seenPlaceIds`).  
**Решение:** Нажать «Сбросить просмотренное» в Настройках. Или увеличить радиус.

---

## Ключевые решения

| Решение | Почему |
|---------|--------|
| `XMLHttpRequest` вместо `fetch` | `fetch()` в React Native использует OkHttp — Wikipedia блокирует его 403. XHR работает через другой сетевой стек и не блокируется |
| `generator=geosearch` (один запрос) | Два запроса (geosearch + details) — второй часто получал 403. Один запрос получает и места, и картинки |
| `getLastKnownPositionAsync` + stale-проверка | `getCurrentPositionAsync` зависает на Xiaomi/MIUI |
| `watchPositionAsync` как фолбэк | Работает даже когда `getCurrentPositionAsync` зависает |
| Региональная система (region.ts) | В Китае Wikipedia/OSM могут быть недоступны; Amap/Baidu работают стабильно |
| `isBoring()` в wikipedia.ts + экспорт в osm.ts | Единый фильтр «скучных» объектов для всех источников |
| Размер превью Wikipedia 500px | 900px — избыточно для карточки, медленно грузится |
| `imgLoaded` state в PlaceCard | Без него — чёрный экран пока идёт загрузка; теперь показывается спиннер |
| `Referer` + `User-Agent` в Image headers | Без них Wikipedia/WMF может вернуть 403 на загрузку изображения |
| Фолбэк-поиск картинок (imageSearch.ts) | Многие статьи Wikipedia без thumbnail; Wikimedia Commons и Openverse дают картинки без API ключа |
| 3 Overpass-сервера с перебором | Основной может вернуть 406 или быть перегружен |
| `requireImage: false` по умолчанию | Большинство OSM-мест без фото; `true` фильтровало почти всё |
| `edgeToEdgeEnabled: false` | Баг в Expo SDK 54 / RN 0.81 — краш при запуске на Android 14+ |
| `exhaustedRef` + `loadingRef` как `useRef` | Синхронные проверки без ре-рендера; `useState` давал race condition при быстрых свайпах |
| `loadMoreRef` для хранения колбэка | Позволяет вызвать актуальное замыкание `loadMore` из обработчика кнопки без устаревших значений |
| `queueIdsRef` для дедупликации | Множество ID позволяет за O(1) проверить, было ли место уже в очереди |
| Release APK через `assembleRelease` | Debug-билд требует Metro; release вшивает бандл и работает автономно |
| `bundleCommand = "export:embed"` в Gradle | Использует Expo CLI вместо стандартного RN bundler — корректно разрешает Expo конфиг |

---

## Как получить API ключи

### Amap (高德地图) — бесплатно, 30К запросов/день

1. Зайди на [lbs.amap.com](https://lbs.amap.com)
2. Зарегистрируйся (можно через телефон)
3. Создай приложение → Добавь ключ → Тип **«Web服务» (Web Services)**
4. Вставь ключ в настройки приложения

### Google Places API — бесплатно до 5000 запросов/день

1. Зайди на [console.cloud.google.com](https://console.cloud.google.com)
2. Создай проект → Включи **Places API**
3. Создай credentials → API Key
4. Вставь ключ в настройки приложения

### Wikimedia Commons / Openverse — ключ не нужен

Работают из коробки, без регистрации. Rate-limited, но для личного использования более чем достаточно.

---

## Что доработать

1. **Карты:** Встроенная карта вместо перехода в Google Maps (`react-native-maps`)
2. **Офлайн:** Кеширование мест в SQLite для работы без сети
3. **iOS:** Тестирование и адаптация (Info.plist для локации уже есть)
4. **Edge-to-edge:** Ждать фикса от Expo SDK 54+ и включить обратно
5. **Навигация:** Альтернатива Google Maps — Baidu Maps для Китая, OSM/Apple Maps
6. **i18n:** Полная локализация интерфейса (сейчас русский захардкожен)
7. **EAS Build:** Настроить облачную сборку вместо локальной
8. **Тесты:** Переписать wikipedia.test.ts под XHR, покрыть регион, Amap, Google, imageSearch
9. **Убрать debug info:** После стабилизации убрать отладочный текст из PlaceCard

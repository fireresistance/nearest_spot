import { NativeModules, Platform } from 'react-native';

export type UILocale = 'ru' | 'en' | 'zh';
export type UILocaleSetting = UILocale | 'auto';

export function detectDeviceLocale(): UILocale {
  try {
    let raw = '';
    if (Platform.OS === 'android') {
      raw = (NativeModules.I18nManager?.localeIdentifier as string | undefined) ?? '';
    } else if (Platform.OS === 'ios') {
      const s = NativeModules.SettingsManager?.settings;
      raw = ((s?.AppleLocale ?? s?.AppleLanguages?.[0]) as string | undefined) ?? '';
    }
    if (!raw) raw = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const primary = raw.split(/[-_]/)[0].toLowerCase();
    if (primary === 'ru') return 'ru';
    if (primary === 'zh') return 'zh';
  } catch {
    // fallback
  }
  return 'en';
}

let current: UILocale = detectDeviceLocale();

export function getUiLocale(): UILocale {
  return current;
}

export function setUiLocale(locale: UILocaleSetting): void {
  current = locale === 'auto' ? detectDeviceLocale() : locale;
}

const ru = {
  tab_nearby: 'Рядом',
  tab_saved: 'Сохранённые',
  tab_settings: 'Настройки',
  header_place: 'Место',
  header_map: 'Карта',

  cat_all: 'Все',
  cat_museum: 'Музеи',
  cat_park: 'Парки',
  cat_worship: 'Храмы',
  cat_monument: 'Памятники',
  cat_historic: 'История',
  cat_other: 'Другое',

  btn_route: 'Маршрут',
  btn_save: 'Сохранить',
  btn_unsave: 'Убрать',
  btn_unsave_long: 'Убрать из сохранённых',
  btn_next: 'Дальше',
  btn_share: 'Поделиться',
  btn_refresh: 'Обновить',
  btn_undo: 'Отменить',
  btn_allow: 'Разрешить',
  btn_open_settings: 'Открыть настройки',
  btn_current: 'Текущая',
  btn_open_source: 'Открыть источник',
  btn_show_on_map: 'Показать на карте',

  nearby_need_location_title: 'Нужна геолокация',
  nearby_need_location_body:
    'Чтобы показывать места рядом, приложению нужен доступ к местоположению "При использовании".',
  nearby_mock_title: 'Или выбери мок-локацию',
  nearby_locating: 'Определяем местоположение…',
  nearby_empty_category_title: 'Нет мест в этой категории',
  nearby_empty_category_body: 'Попробуй другую категорию.',
  nearby_empty_title: 'Нет подходящих мест',
  nearby_empty_body: 'Попробуй увеличить радиус или выключить "Только с фото".',
  nearby_hidden_prefix: 'Скрыто: ',

  settings_theme: 'Тема',
  theme_light: 'Светлая',
  theme_dark: 'Тёмная',
  settings_region: 'Регион',
  settings_region_detected: 'Определён автоматически по координатам',
  settings_region_manual: 'Установлен вручную',
  settings_providers: 'Провайдеры',
  settings_location: 'Локация',
  settings_location_hint: 'Если геолокация не даётся (особенно в web), выбери мок.',
  settings_region_hint: 'Авто — определяет по координатам. В Китае автоматически использует Amap и Baidu.',
  settings_amap_key: 'Amap API ключ',
  settings_amap_placeholder: 'Вставь ключ с lbs.amap.com',
  settings_amap_hint:
    'Бесплатный ключ для 高德地图 (Amap). Регистрация на lbs.amap.com → Web Services API. Без ключа Amap не работает.',
  settings_google_key: 'Google Places API ключ',
  settings_google_hint:
    'Google Places API — ищет достопримечательности с фото. Бесплатно до 5000 запросов/день. console.cloud.google.com → Places API.',
  settings_radius: 'Радиус',
  settings_custom_radius_placeholder: 'Свой радиус (км)',
  settings_radius_hint: 'Wikipedia: макс 10 км. Google/Amap: до 100 км.',
  settings_mode: 'Режим',
  mode_walk: 'Пешком',
  mode_drive: 'На авто',
  settings_wiki_lang: 'Язык Wikipedia',
  settings_wiki_lang_hint: 'Авто — определяет по языку устройства. Если нет результатов, пробует другие языки.',
  settings_require_image: 'Только с фото',
  settings_require_image_hint: 'Убирает выдачу без картинок',
  settings_reset_seen: 'Сбросить просмотренное',
  settings_refresh_location: 'Обновить геолокацию',
  settings_donate: 'Поддержать проект',
  settings_donate_hint: 'Приложение бесплатное и без рекламы. Если оно полезно — можно поддержать разработку.',
  settings_donate_btn: 'Поддержать',
  settings_legal: 'Правовые документы',
  settings_legal_privacy: 'Политика конфиденциальности',
  settings_legal_terms: 'Условия использования',
  header_legal: 'Правовые документы',
  settings_ui_lang: 'Язык интерфейса',
  settings_ui_lang_hint: '«Авто» использует язык системы.',
  auto: 'Авто',
  region_other: 'Другой',

  saved_empty_title: 'Пока пусто',
  saved_empty_body: 'Сохраняй места из ленты, чтобы не потерять.',

  details_source: 'Источник',

  nav_title: 'Построить маршрут',
  nav_message: 'Выберите навигатор',
  cancel: 'Отмена',

  tip_china: 'В Китае Amap и Baidu работают стабильнее Wikipedia/OSM. Получи бесплатный ключ на lbs.amap.com',
  tip_russia: 'Wikipedia и OSM работают в России без ограничений',
  tip_japan: 'Wikipedia и OSM хорошо покрывают Японию',
  tip_europe: 'Wikipedia и OSM отлично работают в Европе',
  tip_americas: 'Wikipedia и OSM отлично работают в Америке',
  tip_other: 'Wikipedia и OSM — основные источники данных',

  unit_m: 'м',
  unit_km: 'км',
  unit_min: 'мин',
  unit_h: 'ч',

  error_location_failed: 'Не удалось определить местоположение',
  error_location_title: 'Ошибка геолокации',
  error_google_key: 'Google API ключ не указан',
  error_amap_key: 'Amap API ключ не указан',
  error_overpass: 'Overpass API недоступна',
} as const;

export type TranslationKey = keyof typeof ru;

const en: Record<TranslationKey, string> = {
  tab_nearby: 'Nearby',
  tab_saved: 'Saved',
  tab_settings: 'Settings',
  header_place: 'Place',
  header_map: 'Map',

  cat_all: 'All',
  cat_museum: 'Museums',
  cat_park: 'Parks',
  cat_worship: 'Temples',
  cat_monument: 'Monuments',
  cat_historic: 'Historic',
  cat_other: 'Other',

  btn_route: 'Route',
  btn_save: 'Save',
  btn_unsave: 'Remove',
  btn_unsave_long: 'Remove from saved',
  btn_next: 'Next',
  btn_share: 'Share',
  btn_refresh: 'Refresh',
  btn_undo: 'Undo',
  btn_allow: 'Allow',
  btn_open_settings: 'Open settings',
  btn_current: 'Current',
  btn_open_source: 'Open source',
  btn_show_on_map: 'Show on map',

  nearby_need_location_title: 'Location needed',
  nearby_need_location_body: 'To show places near you, the app needs "While in use" location access.',
  nearby_mock_title: 'Or pick a mock location',
  nearby_locating: 'Detecting location…',
  nearby_empty_category_title: 'No places in this category',
  nearby_empty_category_body: 'Try another category.',
  nearby_empty_title: 'No places found',
  nearby_empty_body: 'Try a larger radius or turn off "With photo only".',
  nearby_hidden_prefix: 'Hidden: ',

  settings_theme: 'Theme',
  theme_light: 'Light',
  theme_dark: 'Dark',
  settings_region: 'Region',
  settings_region_detected: 'Detected automatically from coordinates',
  settings_region_manual: 'Set manually',
  settings_providers: 'Providers',
  settings_location: 'Location',
  settings_location_hint: 'If geolocation is unavailable (especially on web), pick a mock.',
  settings_region_hint: 'Auto detects from coordinates. In China, Amap and Baidu are used automatically.',
  settings_amap_key: 'Amap API key',
  settings_amap_placeholder: 'Paste key from lbs.amap.com',
  settings_amap_hint:
    'Free key for 高德地图 (Amap). Register at lbs.amap.com → Web Services API. Amap does not work without a key.',
  settings_google_key: 'Google Places API key',
  settings_google_hint:
    'Google Places API finds attractions with photos. Free up to 5000 requests/day. console.cloud.google.com → Places API.',
  settings_radius: 'Radius',
  settings_custom_radius_placeholder: 'Custom radius (km)',
  settings_radius_hint: 'Wikipedia: max 10 km. Google/Amap: up to 100 km.',
  settings_mode: 'Travel mode',
  mode_walk: 'On foot',
  mode_drive: 'By car',
  settings_wiki_lang: 'Wikipedia language',
  settings_wiki_lang_hint: 'Auto uses the device language. Falls back to other languages if no results.',
  settings_require_image: 'With photo only',
  settings_require_image_hint: 'Hides places without images',
  settings_reset_seen: 'Reset seen places',
  settings_refresh_location: 'Refresh location',
  settings_donate: 'Support the project',
  settings_donate_hint: 'The app is free and ad-free. If you find it useful, you can support development.',
  settings_donate_btn: 'Donate',
  settings_legal: 'Legal',
  settings_legal_privacy: 'Privacy Policy',
  settings_legal_terms: 'Terms of Service',
  header_legal: 'Legal',
  settings_ui_lang: 'App language',
  settings_ui_lang_hint: 'Auto follows the system language.',
  auto: 'Auto',
  region_other: 'Other',

  saved_empty_title: 'Nothing here yet',
  saved_empty_body: 'Save places from the feed to find them later.',

  details_source: 'Source',

  nav_title: 'Build route',
  nav_message: 'Choose navigation app',
  cancel: 'Cancel',

  tip_china: 'In China, Amap and Baidu are more reliable than Wikipedia/OSM. Get a free key at lbs.amap.com',
  tip_russia: 'Wikipedia and OSM work without restrictions in Russia',
  tip_japan: 'Wikipedia and OSM cover Japan well',
  tip_europe: 'Wikipedia and OSM work great in Europe',
  tip_americas: 'Wikipedia and OSM work great in the Americas',
  tip_other: 'Wikipedia and OSM are the main data sources',

  unit_m: 'm',
  unit_km: 'km',
  unit_min: 'min',
  unit_h: 'h',

  error_location_failed: 'Failed to determine location',
  error_location_title: 'Location error',
  error_google_key: 'Google API key is not set',
  error_amap_key: 'Amap API key is not set',
  error_overpass: 'Overpass API is unavailable',
};

const zh: Record<TranslationKey, string> = {
  tab_nearby: '附近',
  tab_saved: '收藏',
  tab_settings: '设置',
  header_place: '地点',
  header_map: '地图',

  cat_all: '全部',
  cat_museum: '博物馆',
  cat_park: '公园',
  cat_worship: '寺庙',
  cat_monument: '纪念碑',
  cat_historic: '历史',
  cat_other: '其他',

  btn_route: '路线',
  btn_save: '收藏',
  btn_unsave: '取消',
  btn_unsave_long: '取消收藏',
  btn_next: '下一个',
  btn_share: '分享',
  btn_refresh: '刷新',
  btn_undo: '撤销',
  btn_allow: '允许',
  btn_open_settings: '打开设置',
  btn_current: '当前位置',
  btn_open_source: '查看来源',
  btn_show_on_map: '在地图上显示',

  nearby_need_location_title: '需要定位权限',
  nearby_need_location_body: '为了显示附近的地点，应用需要"使用期间"定位权限。',
  nearby_mock_title: '或选择模拟位置',
  nearby_locating: '正在定位…',
  nearby_empty_category_title: '该分类没有地点',
  nearby_empty_category_body: '试试其他分类。',
  nearby_empty_title: '没有找到地点',
  nearby_empty_body: '试试增大半径或关闭"仅有照片"。',
  nearby_hidden_prefix: '已隐藏：',

  settings_theme: '主题',
  theme_light: '浅色',
  theme_dark: '深色',
  settings_region: '地区',
  settings_region_detected: '根据坐标自动检测',
  settings_region_manual: '手动设置',
  settings_providers: '数据源',
  settings_location: '位置',
  settings_location_hint: '如果无法定位（尤其是网页版），请选择模拟位置。',
  settings_region_hint: '自动——根据坐标检测。在中国会自动使用高德和百度。',
  settings_amap_key: '高德 API 密钥',
  settings_amap_placeholder: '粘贴 lbs.amap.com 的密钥',
  settings_amap_hint: '高德地图的免费密钥。在 lbs.amap.com 注册 → Web Services API。没有密钥高德无法使用。',
  settings_google_key: 'Google Places API 密钥',
  settings_google_hint:
    'Google Places API——搜索带照片的名胜。每天免费 5000 次请求。console.cloud.google.com → Places API。',
  settings_radius: '半径',
  settings_custom_radius_placeholder: '自定义半径（公里）',
  settings_radius_hint: 'Wikipedia：最远 10 公里。高德/Google：最远 100 公里。',
  settings_mode: '出行方式',
  mode_walk: '步行',
  mode_drive: '驾车',
  settings_wiki_lang: 'Wikipedia 语言',
  settings_wiki_lang_hint: '自动——跟随设备语言。无结果时尝试其他语言。',
  settings_require_image: '仅有照片',
  settings_require_image_hint: '隐藏没有图片的地点',
  settings_reset_seen: '重置已看记录',
  settings_refresh_location: '刷新定位',
  settings_donate: '支持项目',
  settings_donate_hint: '应用免费且无广告。如果对你有帮助，可以支持开发。',
  settings_donate_btn: '捐赠',
  settings_legal: '法律文件',
  settings_legal_privacy: '隐私政策',
  settings_legal_terms: '使用条款',
  header_legal: '法律文件',
  settings_ui_lang: '界面语言',
  settings_ui_lang_hint: '自动跟随系统语言。',
  auto: '自动',
  region_other: '其他',

  saved_empty_title: '暂无收藏',
  saved_empty_body: '从附近动态收藏地点，以免丢失。',

  details_source: '来源',

  nav_title: '规划路线',
  nav_message: '选择导航应用',
  cancel: '取消',

  tip_china: '在中国，高德和百度比 Wikipedia/OSM 更稳定。可在 lbs.amap.com 获取免费密钥',
  tip_russia: 'Wikipedia 和 OSM 在俄罗斯可正常使用',
  tip_japan: 'Wikipedia 和 OSM 在日本覆盖良好',
  tip_europe: 'Wikipedia 和 OSM 在欧洲非常好用',
  tip_americas: 'Wikipedia 和 OSM 在美洲非常好用',
  tip_other: 'Wikipedia 和 OSM 是主要数据来源',

  unit_m: '米',
  unit_km: '公里',
  unit_min: '分钟',
  unit_h: '小时',

  error_location_failed: '无法确定位置',
  error_location_title: '定位错误',
  error_google_key: '未设置 Google API 密钥',
  error_amap_key: '未设置高德 API 密钥',
  error_overpass: 'Overpass API 不可用',
};

const DICTS: Record<UILocale, Record<TranslationKey, string>> = { ru, en, zh };

export function t(key: TranslationKey): string {
  return DICTS[current][key] ?? en[key];
}

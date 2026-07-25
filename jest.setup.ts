jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 0, longitude: 0 } })),
}));

import '@testing-library/jest-native/extend-expect';

class FakeXMLHttpRequest {
  static UNSENT = 0;
  static OPENED = 1;
  static HEADERS_RECEIVED = 2;
  static LOADING = 3;
  static DONE = 4;

  timeout = 0;
  status = 0;
  responseText = '';
  readyState = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;

  private method = 'GET';
  private url = '';
  private requestHeaders: Record<string, string> = {};

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }

  getResponseHeader(key: string): string | null {
    if (key.toLowerCase() === 'content-type') return 'application/json';
    return null;
  }

  getAllResponseHeaders(): string {
    return 'content-type: application/json';
  }

  abort() {}

  send(body?: unknown) {
    const url = this.url;
    const timer =
      this.timeout > 0
        ? setTimeout(() => {
            this.ontimeout?.();
          }, this.timeout)
        : null;

    global
      .fetch(url, { method: this.method, headers: this.requestHeaders, body: body as never })
      .then(async (res) => {
        if (timer) clearTimeout(timer);
        this.status = res.status;
        const r = res as unknown as { text?: () => Promise<string>; json?: () => Promise<unknown> };
        if (typeof r.text === 'function') {
          this.responseText = await r.text();
        } else if (typeof r.json === 'function') {
          this.responseText = JSON.stringify(await r.json());
        } else {
          this.responseText = '';
        }
        this.readyState = 4;
        this.onload?.();
      })
      .catch(() => {
        if (timer) clearTimeout(timer);
        this.onerror?.();
      });
  }
}

(global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXMLHttpRequest;

import { setUiLocale } from './src/i18n';
setUiLocale('ru');

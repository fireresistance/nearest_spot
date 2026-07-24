import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '../src/state/AppProvider';
import { NearbyScreen } from '../src/screens/NearbyScreen';
import { MOCK_LOCATIONS } from '../src/constants/mockLocations';

const MOSCOW_PAGES: Record<string, unknown> = {
  '4026512': {
    pageid: 4026512,
    title: 'Iberian Gate and Chapel',
    ns: 0,
    coordinates: [{ lat: 55.75555555555555, lon: 37.61805555555556, dist: 54.5 }],
    fullurl: 'https://en.wikipedia.org/wiki/Iberian_Gate_and_Chapel',
    extract: 'Resurrection Gate is the only remaining gate of Kitay-gorod in Moscow, Russia.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Manezhnaya.jpg/500px-Manezhnaya.jpg',
      width: 500,
      height: 333,
    },
  },
  '4928727': {
    pageid: 4928727,
    title: 'Moscow City Hall',
    ns: 0,
    coordinates: [{ lat: 55.75611111111111, lon: 37.618611111111115, dist: 89 }],
    fullurl: 'https://en.wikipedia.org/wiki/Moscow_City_Hall',
    extract: 'The former Moscow City Hall is an ornate red-brick edifice.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/2014_Moscow_Lenin_Museum.JPG/500px-2014_Moscow_Lenin_Museum.JPG',
      width: 500,
      height: 667,
    },
  },
  '806516': {
    pageid: 806516,
    title: 'State Historical Museum',
    ns: 0,
    coordinates: [{ lat: 55.755, lon: 37.6181, dist: 102.1 }],
    fullurl: 'https://en.wikipedia.org/wiki/State_Historical_Museum',
    extract: 'The State Historical Museum of Russia is a museum of Russian history.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Museo_Estatal.jpg/500px-Museo_Estatal.jpg',
      width: 500,
      height: 333,
    },
  },
  '4002193': {
    pageid: 4002193,
    title: 'Kazan Cathedral, Moscow',
    ns: 0,
    coordinates: [{ lat: 55.75548055555556, lon: 37.61921111111111, dist: 124.7 }],
    fullurl: 'https://en.wikipedia.org/wiki/Kazan_Cathedral,_Moscow',
    extract: 'Kazan Cathedral is a Russian Orthodox church located on the northwest corner of Red Square.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Kazansky_Cathedral_in_MSK.jpg/500px-Kazansky_Cathedral_in_MSK.jpg',
      width: 500,
      height: 333,
    },
  },
  '3957741': {
    pageid: 3957741,
    title: 'Four Seasons Hotel Moscow',
    ns: 0,
    coordinates: [{ lat: 55.75694444444444, lon: 37.61666666666667, dist: 133.3 }],
    fullurl: 'https://en.wikipedia.org/wiki/Four_Seasons_Hotel_Moscow',
    extract: 'The Four Seasons Hotel Moscow is a modern luxury hotel in Manezhnaya Square.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Moskva_Hotel.jpg/500px-Moskva_Hotel.jpg',
      width: 500,
      height: 333,
    },
  },
  '1901461': {
    pageid: 1901461,
    title: 'Tomb of the Unknown Soldier (Moscow)',
    ns: 0,
    coordinates: [{ lat: 55.75472222222222, lon: 37.61611111111111, dist: 141.1 }],
    fullurl: 'https://en.wikipedia.org/wiki/Tomb_of_the_Unknown_Soldier_(Moscow)',
    extract: 'The Tomb of the Unknown Soldier is a war memorial in the Alexander Garden in Moscow.',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Tomb.jpg/500px-Tomb.jpg',
      width: 500,
      height: 333,
    },
  },
};

function mockFetchWithMoscowRealPlaces() {
  const fetchMock = global.fetch as unknown as jest.Mock;
  fetchMock.mockImplementation(async (input: unknown) => {
    const url: string =
      typeof input === 'string' ? input : (input as { url?: string })?.url ? String((input as { url?: string }).url) : String(input);
    if (url.includes('generator=geosearch')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ query: { pages: MOSCOW_PAGES } }),
      };
    }
    if (url.includes('overpass')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      };
    }
    if (url.includes('openverse')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ query: { pages: {} } }),
    };
  });
}

function renderNearby() {
  return render(
    <AppProvider initialLocationOverride={{ kind: 'mock', mock: MOCK_LOCATIONS[0] }}>
      <NearbyScreen
        navigation={{ navigate: jest.fn() } as never}
        route={{ key: 'Nearby', name: 'Nearby' } as never}
      />
    </AppProvider>,
  );
}

beforeEach(async () => {
  global.fetch = jest.fn();
  await AsyncStorage.clear();
});

test('nearby screen loads by mock location and shows places', async () => {
  mockFetchWithMoscowRealPlaces();

  renderNearby();
  expect(await screen.findByText('Iberian Gate and Chapel')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Moscow City Hall')).toBeTruthy();
});

test('already dismissed places are not shown again', async () => {
  mockFetchWithMoscowRealPlaces();
  renderNearby();

  expect(await screen.findByText('Iberian Gate and Chapel')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Moscow City Hall')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('State Historical Museum')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Kazan Cathedral, Moscow')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Four Seasons Hotel Moscow')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Tomb of the Unknown Soldier (Moscow)')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));

  expect(await screen.findByText('Нет подходящих мест')).toBeTruthy();
});

test('undo restores dismissed place', async () => {
  mockFetchWithMoscowRealPlaces();
  renderNearby();

  expect(await screen.findByText('Iberian Gate and Chapel')).toBeTruthy();
  fireEvent.press(screen.getByText('Дальше'));
  expect(await screen.findByText('Moscow City Hall')).toBeTruthy();

  fireEvent.press(screen.getByText('Отменить'));
  expect(await screen.findByText('Iberian Gate and Chapel')).toBeTruthy();
});

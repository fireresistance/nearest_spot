import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '../src/state/AppProvider';
import { NearbyScreen } from '../src/screens/NearbyScreen';
import { MOCK_LOCATIONS } from '../src/constants/mockLocations';

function mockFetchWithMoscowRealPlaces() {
  const fetchMock = global.fetch as unknown as jest.Mock;
  fetchMock.mockImplementation(async (input: any) => {
    const url: string = typeof input === 'string' ? input : input?.url ? String(input.url) : String(input);
    if (url.includes('list=geosearch')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          query: {
            geosearch: [
              { pageid: 4026512, title: 'Iberian Gate and Chapel', lat: 55.75555555555555, lon: 37.61805555555556, dist: 54.5 },
              { pageid: 4928727, title: 'Moscow City Hall', lat: 55.75611111111111, lon: 37.618611111111115, dist: 89 },
              { pageid: 806516, title: 'State Historical Museum', lat: 55.755, lon: 37.6181, dist: 102.1 },
              { pageid: 4002193, title: 'Kazan Cathedral, Moscow', lat: 55.75548055555556, lon: 37.61921111111111, dist: 124.7 },
              { pageid: 3957741, title: 'Four Seasons Hotel Moscow', lat: 55.75694444444444, lon: 37.61666666666667, dist: 133.3 },
              { pageid: 1901461, title: 'Tomb of the Unknown Soldier (Moscow)', lat: 55.75472222222222, lon: 37.61611111111111, dist: 141.1 },
            ],
          },
        }),
      };
    }
    if (url.includes('prop=pageimages')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          query: {
            pages: {
              '4026512': {
                pageid: 4026512,
                title: 'Iberian Gate and Chapel',
                fullurl: 'https://en.wikipedia.org/wiki/Iberian_Gate_and_Chapel',
                extract:
                  'Resurrection Gate (Russian: Воскресенские ворота, romanized: Voskresenskiye vorota) or Iberian Gate (Russian: Иверские ворота, romanized: Iverskiye vorota) is the only remaining gate of Kitay-gorod in Moscow, Russia. It connects the north-western end of Red Square with Manege Square and gives its name to nearby Voskresenskaya Square (Resurrection Square, renamed Revolution Square in 1918).',
                thumbnail: {
                  source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Manezhnaya.jpg/500px-Manezhnaya.jpg',
                  width: 500,
                  height: 333,
                },
              },
              '4928727': {
                pageid: 4928727,
                title: 'Moscow City Hall',
                fullurl: 'https://en.wikipedia.org/wiki/Moscow_City_Hall',
                extract:
                  "The former Moscow City Hall (Russian: Здание городской думы, lit. 'City Duma building') is an ornate red-brick edifice situated immediately to the east of the State Historical Museum and notable in the history of architecture as a unique hybrid of the Russian Revival and Neo-Renaissance styles. During Soviet times it served as the Lenin Museum in Moscow.",
                thumbnail: {
                  source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/2014_Moscow_Lenin_Museum.JPG/500px-2014_Moscow_Lenin_Museum.JPG',
                  width: 500,
                  height: 667,
                },
              },
              '806516': {
                pageid: 806516,
                title: 'State Historical Museum',
                fullurl: 'https://en.wikipedia.org/wiki/State_Historical_Museum',
                extract:
                  "The State Historical Museum (Russian: Государственный исторический музей, ГИМ, romanized: Gosudarstvennyy istoricheskiy muzey, GIM) of Russia is a museum of Russian history located between Red Square and Manege Square in Moscow. The museum's exhibitions range from relics of prehistoric tribes that lived in the territory of present-day Russia, to priceless artworks acquired by members of the Romanov dynasty.",
                thumbnail: {
                  source:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Museo_Estatal_de_Historia%2C_Mosc%C3%BA%2C_Rusia%2C_2016-10-03%2C_DD_49.jpg/500px-Museo_Estatal_de_Historia%2C_Mosc%C3%BA%2C_Rusia%2C_2016-10-03%2C_DD_49.jpg',
                  width: 500,
                  height: 333,
                },
              },
              '4002193': {
                pageid: 4002193,
                title: 'Kazan Cathedral, Moscow',
                fullurl: 'https://en.wikipedia.org/wiki/Kazan_Cathedral,_Moscow',
                extract:
                  'Kazan Cathedral (Russian: Казанский собор, romanized: Kazanskiy sobor), formally known as the "Cathedral of Our Lady of Kazan", is a Russian Orthodox church located on the northwest corner of Red Square in Moscow, Russia. The current building is a reconstruction of the original church, which was destroyed on the orders of Joseph Stalin in 1936.',
                thumbnail: {
                  source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Kazansky_Cathedral_in_MSK.jpg/500px-Kazansky_Cathedral_in_MSK.jpg',
                  width: 500,
                  height: 333,
                },
              },
              '3957741': {
                pageid: 3957741,
                title: 'Four Seasons Hotel Moscow',
                fullurl: 'https://en.wikipedia.org/wiki/Four_Seasons_Hotel_Moscow',
                extract:
                  "The Four Seasons Hotel Moscow is a modern luxury hotel in Manezhnaya Square in the Tverskoy District, central Moscow, Russia. It opened on October 30, 2014, with a facade that replicates the Soviet Hotel Moskva of the 1930s (Russian: Гости́ница «Москва́»), which previously stood o on the same location.",
                thumbnail: {
                  source:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Moskva_Hotel_in_MSK_%28img1%29.jpg/500px-Moskva_Hotel_in_MSK_%28img1%29.jpg',
                  width: 500,
                  height: 333,
                },
              },
              '1901461': {
                pageid: 1901461,
                title: 'Tomb of the Unknown Soldier (Moscow)',
                fullurl: 'https://en.wikipedia.org/wiki/Tomb_of_the_Unknown_Soldier_(Moscow)',
                extract:
                  'The Tomb of the Unknown Soldier (Russian: Могила Неизвестного Солдата, IPA: [mɐˈɡʲilə nʲɪɪˈzvʲɛsnəvə sɐlˈdatə]) is a war memorial in the Alexander Garden in Moscow near the Kremlin dedicated to the Soviet soldiers killed during World War II. It was designed by architects D. I. Burdin, V. A. Klimov, Yu. R. Rabayev and sculptor Nikolai Tomsky.',
                thumbnail: {
                  source:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Tomb_of_the_Unknown_Soldier_with_a_guard_in_Moscow.jpg/500px-Tomb_of_the_Unknown_Soldier_with_a_guard_in_Moscow.jpg',
                  width: 500,
                  height: 333,
                },
              },
            },
          },
        }),
      };
    }
    throw new Error(`Unexpected URL in fetch mock: ${url}`);
  });
}

function renderNearby() {
  return render(
    <AppProvider initialLocationOverride={{ kind: 'mock', mock: MOCK_LOCATIONS[0] }}>
      <NearbyScreen
        navigation={{ navigate: jest.fn() } as any}
        route={{ key: 'Nearby', name: 'Nearby' } as any}
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
  expect(screen.queryByText('Iberian Gate and Chapel')).toBeNull();
});

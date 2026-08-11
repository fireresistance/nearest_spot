import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NearbyScreen } from '../screens/NearbyScreen';
import { PlaceDetailsScreen } from '../screens/PlaceDetailsScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SavedMapScreen } from '../screens/SavedMapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { NavigationPickerHost } from '../ui/NavigationPicker';
import { useApp } from '../state/AppProvider';
import { getUiLocale, t } from '../i18n';
import type { Place } from '../types/place';

export type NearbyStackParamList = {
  Nearby: undefined;
  PlaceDetails: { place: Place };
};

export type SavedStackParamList = {
  Saved: undefined;
  SavedMap: undefined;
  PlaceDetails: { place: Place };
};

export type SettingsStackParamList = {
  Settings: undefined;
  Legal: { doc: 'privacy' | 'terms' };
};

const NearbyStack = createNativeStackNavigator<NearbyStackParamList>();
function NearbyStackNavigator() {
  return (
    <NearbyStack.Navigator>
      <NearbyStack.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{ title: t('tab_nearby') }}
      />
      <NearbyStack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: t('header_place') }}
      />
    </NearbyStack.Navigator>
  );
}

const SavedStack = createNativeStackNavigator<SavedStackParamList>();
function SavedStackNavigator() {
  return (
    <SavedStack.Navigator>
      <SavedStack.Screen
        name="Saved"
        component={SavedScreen}
        options={{ title: t('tab_saved') }}
      />
      <SavedStack.Screen
        name="SavedMap"
        component={SavedMapScreen}
        options={{ title: t('header_map') }}
      />
      <SavedStack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: t('header_place') }}
      />
    </SavedStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tab_settings') }}
      />
      <SettingsStack.Screen
        name="Legal"
        component={LegalScreen}
        options={{ title: t('header_legal') }}
      />
    </SettingsStack.Navigator>
  );
}

export type RootTabParamList = {
  NearbyTab: undefined;
  SavedTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const { settings } = useApp();
  const uiLocaleKey = settings.uiLocale === 'auto' ? getUiLocale() : settings.uiLocale;
  return (
    <>
      <Tab.Navigator key={uiLocaleKey}>
        <Tab.Screen
          name="NearbyTab"
          component={NearbyStackNavigator}
          options={{
            title: t('tab_nearby'),
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="SavedTab"
          component={SavedStackNavigator}
          options={{
            title: t('tab_saved'),
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStackNavigator}
          options={{
            title: t('tab_settings'),
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
      <NavigationPickerHost />
    </>
  );
}

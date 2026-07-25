import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NearbyScreen } from '../screens/NearbyScreen';
import { PlaceDetailsScreen } from '../screens/PlaceDetailsScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SavedMapScreen } from '../screens/SavedMapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { t } from '../i18n';
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

export type RootTabParamList = {
  NearbyTab: undefined;
  SavedTab: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="NearbyTab"
        component={NearbyStackNavigator}
        options={{ title: t('tab_nearby'), headerShown: false }}
      />
      <Tab.Screen
        name="SavedTab"
        component={SavedStackNavigator}
        options={{ title: t('tab_saved'), headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tab_settings'), headerShown: true }}
      />
    </Tab.Navigator>
  );
}

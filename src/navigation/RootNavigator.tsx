import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NearbyScreen } from '../screens/NearbyScreen';
import { PlaceDetailsScreen } from '../screens/PlaceDetailsScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SavedMapScreen } from '../screens/SavedMapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NavigationPickerHost } from '../ui/NavigationPicker';
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
    <>
      <Tab.Navigator>
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
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('tab_settings'),
            headerShown: true,
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

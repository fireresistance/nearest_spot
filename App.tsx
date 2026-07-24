import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/state/AppProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedNavigation() {
  const { settings } = useApp();
  const isDark = settings.theme === 'dark';
  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <ThemedNavigation />
      </SafeAreaProvider>
    </AppProvider>
  );
}

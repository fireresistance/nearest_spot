import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, type Theme } from '../ui/theme';
import { useMemo } from 'react';
import type { SettingsStackParamList } from '../navigation/RootNavigator';

const BASE = 'https://fireresistance.github.io/nearest_spot';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Legal'>;

export function LegalScreen({ route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { doc } = route.params;
  const url = `${BASE}/${doc}.html`;
  return (
    <View style={styles.container}>
      <WebView source={{ uri: url }} style={styles.webview} />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    webview: { flex: 1 },
  });

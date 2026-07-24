import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from './theme';

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  const variant = props.variant ?? 'primary';
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary'
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.secondary },
        props.disabled ? styles.disabled : null,
        pressed && !props.disabled ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: variant === 'primary' ? theme.primaryText : theme.secondaryText },
        ]}
      >
        {props.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

import { Pressable, StyleSheet, Text } from 'react-native';

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const variant = props.variant ?? 'primary';
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        props.disabled ? styles.disabled : null,
        pressed && !props.disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary]}>
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
  primary: {
    backgroundColor: '#111827',
  },
  secondary: {
    backgroundColor: '#E5E7EB',
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
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#111827',
  },
});


import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../../stores/ui.store';
import { Colors, Spacing, Radius } from '../../constants/theme';

const ICON_MAP = {
  success: 'checkmark-circle' as const,
  error:   'alert-circle'     as const,
  warning: 'warning'          as const,
  info:    'information-circle' as const,
};

const COLOR_MAP = {
  success: Colors.ACCENT,
  error:   Colors.RED,
  warning: Colors.ORANGE,
  info:    Colors.BLUE,
};

function ToastItem({ message, type }: { message: string; type: string }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue:         1,
        duration:        250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue:         0,
        duration:        250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const color = COLOR_MAP[type as keyof typeof COLOR_MAP] ?? Colors.BLUE;
  const icon  = ICON_MAP[type  as keyof typeof ICON_MAP]  ?? 'information-circle';

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} type={t.type} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:          'absolute',
    top:               60,
    left:              Spacing.S5,
    right:             Spacing.S5,
    gap:               8,
    zIndex:            999,
  },
  toast: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER_2,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.3,
    shadowRadius:      8,
    elevation:         8,
  },
  toastText: {
    fontSize:   13,
    color:      Colors.TEXT_PRIMARY,
    fontWeight: '500',
    flex:       1,
  },
});
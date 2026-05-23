import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface EmptyStateProps {
  icon:        keyof typeof Ionicons.glyphMap;
  title:       string;
  subtitle:    string;
  actionLabel?: string;
  onAction?:   () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={Colors.TEXT_TERTIARY} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: Spacing.S12,
    paddingHorizontal: Spacing.S8,
    gap:            Spacing.S3,
  },
  iconWrap: {
    width:           64,
    height:          64,
    borderRadius:    20,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.S2,
  },
  title: {
    fontSize:     16,
    fontWeight:   '600',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
    textAlign:    'center',
  },
  subtitle: {
    fontSize:   13,
    color:      Colors.TEXT_TERTIARY,
    textAlign:  'center',
    lineHeight: 20,
  },
  btn: {
    marginTop:         Spacing.S2,
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    backgroundColor:   Colors.ACCENT,
    borderRadius:      Radius.FULL,
  },
  btnText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.BG_BASE,
  },
});
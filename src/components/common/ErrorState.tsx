import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface ErrorStateProps {
  message?:  string;
  onRetry?:  () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={28} color={Colors.RED} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {message ?? 'Could not load data. Check your connection and try again.'}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={14} color={Colors.TEXT_PRIMARY} />
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   Spacing.S12,
    paddingHorizontal: Spacing.S8,
    gap:               Spacing.S3,
  },
  iconWrap: {
    width:           56,
    height:          56,
    borderRadius:    16,
    backgroundColor: Colors.RED_DIM,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.RED + '30',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.S2,
  },
  title: {
    fontSize:     15,
    fontWeight:   '600',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  message: {
    fontSize:   13,
    color:      Colors.TEXT_TERTIARY,
    textAlign:  'center',
    lineHeight: 20,
  },
  btn: {
    marginTop:         Spacing.S2,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.FULL,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  btnText: {
    fontSize:   13,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
});
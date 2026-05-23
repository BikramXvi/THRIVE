import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeTop(): number {
  const insets = useSafeAreaInsets();
  return insets.top + 12;
}
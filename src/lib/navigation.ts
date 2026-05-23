import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate(name));
  }
}
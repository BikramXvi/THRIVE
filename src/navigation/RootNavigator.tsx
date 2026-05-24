import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/auth/Onboarding.screen';
import { navigationRef } from '../lib/navigation';
import { supabase } from '../lib/supabase';
import { EditProfileScreen } from '../screens/profile/EditProfile.screen';

export type RootStackParamList = {
  Auth:       undefined;
  Onboarding: undefined;
  Main:       undefined;
  
};


const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, setSession, setLoading } = useAuthStore();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    authService.getSession().then(({ data }) => {
      setSession(data);
      setLoading(false);
    });

    const { data: listener } = authService.onAuthStateChange((newSession) => {
      setSession(newSession);
      if (newSession) {
        checkOnboarded(newSession.user.id);
      } else {
        setOnboarded(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      checkOnboarded(session.user.id);
    }
  }, [session]);

  async function checkOnboarded(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('onboarded_at')
      .eq('id', userId)
      .single();
  
    const profile = data as { onboarded_at: string | null } | null;
    setOnboarded(!!profile?.onboarded_at);
  }

  

  // Still checking onboarding status -- show nothing
  if (session && onboarded === null) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth"       component={AuthNavigator}    />
        ) : !onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main"       component={TabNavigator}     />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
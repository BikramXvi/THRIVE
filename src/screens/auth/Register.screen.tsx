import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Sizing } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const registerSchema = z.object({
  email:           z.string().email('Enter a valid email'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterForm) {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email:    values.email,
      password: values.password,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.user) {
      await supabase.from('users').upsert({
        id:       data.user.id,
        email:    data.user.email ?? '',
        username: data.user.email?.split('@')[0] ?? 'user',
        tier:     'free',
      } as any);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>FitNepal</Text>
          <Text style={styles.tagline}>Start your journey today.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create account</Text>

          {authError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              )}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.TEXT_TERTIARY}
                    secureTextEntry={!showPassword}
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((p) => !p)}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  secureTextEntry={!showPassword}
                />
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.cta, isSubmitting && styles.ctaDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.BG_BASE} />
            ) : (
              <Text style={styles.ctaText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.S5,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    color: Colors.ACCENT,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.ACCENT,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: Colors.TEXT_SECONDARY,
  },
  form: {
    width: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_PRIMARY,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  errorBox: {
    backgroundColor: Colors.RED_DIM,
    borderRadius: Radius.MD,
    padding: Spacing.S3,
    marginBottom: Spacing.S4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.RED,
  },
  errorText: {
    color: Colors.RED,
    fontSize: 13,
  },
  field: {
    marginBottom: Spacing.S4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.TEXT_SECONDARY,
    marginBottom: Spacing.S2,
  },
  input: {
    height: Sizing.INPUT_HEIGHT,
    backgroundColor: Colors.BG_SURFACE_2,
    borderRadius: Radius.MD,
    paddingHorizontal: Spacing.S4,
    fontSize: 15,
    color: Colors.TEXT_PRIMARY,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.BORDER,
  },
  inputError: {
    borderColor: Colors.RED,
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 72,
  },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.S4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 13,
    color: Colors.ACCENT,
    fontWeight: '500',
  },
  fieldError: {
    color: Colors.RED,
    fontSize: 12,
    marginTop: 4,
  },
  cta: {
    height: Sizing.CTA_HEIGHT,
    backgroundColor: Colors.ACCENT,
    borderRadius: Radius.FULL,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.S4,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.BG_BASE,
    letterSpacing: -0.3,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: Spacing.S6,
  },
  switchText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  switchLink: {
    color: Colors.ACCENT,
    fontWeight: '500',
  },
});
// ─────────────────────────────────────────────
// Auth Service
// All authentication operations.
// Never call Supabase auth directly in components.
// ─────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';
import type { Session } from '@supabase/supabase-js';

export const authService = {
  async signUpWithEmail(
    email: string,
    password: string
  ): Promise<ServiceResult<Session>> {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { data: null, error: { code: error.status?.toString() ?? 'AUTH_ERROR', message: error.message } };
      if (!data.session) return { data: null, error: { code: 'NO_SESSION', message: 'Account created. Please verify your email.' } };
      return { data: data.session, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Something went wrong. Try again.', details: err } };
    }
  },

  async signInWithEmail(
    email: string,
    password: string
  ): Promise<ServiceResult<Session>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { data: null, error: { code: error.status?.toString() ?? 'AUTH_ERROR', message: error.message } };
      if (!data.session) return { data: null, error: { code: 'NO_SESSION', message: 'Login failed. Try again.' } };
      return { data: data.session, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Something went wrong. Try again.', details: err } };
    }
  },

  async signOut(): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { data: null, error: { code: 'SIGNOUT_ERROR', message: error.message } };
      return { data: undefined, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Sign out failed.', details: err } };
    }
  },

  async getSession(): Promise<ServiceResult<Session | null>> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { data: null, error: { code: 'SESSION_ERROR', message: error.message } };
      return { data: data.session, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load session.', details: err } };
    }
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
};
import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { UserProfile } from '../models/data.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private router = inject(Router);

  // Auth state signals
  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  session = signal<Session | null>(null);
  loading = signal(true);

  // Computed
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.userProfile()?.role === 'admin');
  isManager = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Get current session
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session) {
        this.session.set(session);
        this.currentUser.set(session.user);
        await this.loadUserProfile(session.user.id);
      }

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          this.session.set(session);
          this.currentUser.set(session.user);
          await this.loadUserProfile(session.user.id);
        } else {
          this.session.set(null);
          this.currentUser.set(null);
          this.userProfile.set(null);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadUserProfile(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        this.userProfile.set(data as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  // Sign Up
  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Sign In
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Sign Out
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  // Reset Password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update Password
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get Supabase client for other services
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

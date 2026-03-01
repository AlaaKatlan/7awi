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

  // Signals
  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  session = signal<Session | null>(null);
  loading = signal(true);

  // الصلاحيات
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.userProfile()?.role === 'admin');
  isManager = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));
  isFinance = computed(() => ['finance'].includes(this.userProfile()?.role || ''));
  isSales = computed(() => ['sales'].includes(this.userProfile()?.role || ''));
  isHou = computed(() => ['hou'].includes(this.userProfile()?.role || ''));
  // ✅ هذا السطر الذي كان ينقصك وشغل المشاكل
  canManageEmployees = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    this.initializeAuth();
  }

  getClient() { return this.supabase; }

  // دالة مساعدة لخدمة التتبع
  currentUserSignal() { return this.currentUser(); }

  private async initializeAuth() {
    this.loading.set(true);
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data?.session) {
        this.session.set(data.session);
        this.currentUser.set(data.session.user);
        await this.loadUserProfile(data.session.user.id);
      }
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          this.session.set(session);
          this.currentUser.set(session.user);
          if (!this.userProfile()) await this.loadUserProfile(session.user.id);
        } else {
          this.session.set(null);
          this.currentUser.set(null);
          this.userProfile.set(null);
        }
        this.loading.set(false);
      });
    } catch (error) { console.warn('Auth init error', error); }
    finally { this.loading.set(false); }
  }

  private async loadUserProfile(userId: string) {
    const { data } = await this.supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (data) this.userProfile.set(data as UserProfile);
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async signOut() {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  async updatePassword(pass: string) {
    const { error } = await this.supabase.auth.updateUser({ password: pass });
    return { success: !error, error: error?.message };
  }
}

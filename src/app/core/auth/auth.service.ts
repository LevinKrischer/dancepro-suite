import { computed, Injectable, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';

import { getSupabaseClient, getSupabaseSchemaClient } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseClient();
  private readonly schemaClient = getSupabaseSchemaClient();

  private initPromise: Promise<void> | null = null;

  readonly user = signal<User | null>(null);
  readonly roleKeys = signal<string[]>([]);
  readonly isLoading = signal(false);

  readonly isAuthenticated = computed(() => !!this.user());

  init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        throw new Error(error.message);
      }

      const currentUser = data.session?.user ?? null;
      this.user.set(currentUser);
      await this.loadRoleKeys(currentUser?.id ?? null);

      this.supabase.auth.onAuthStateChange(async (_event, session) => {
        const nextUser = session?.user ?? null;
        this.user.set(nextUser);
        await this.loadRoleKeys(nextUser?.id ?? null);
      });
    })();

    return this.initPromise;
  }

  async signIn(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const nextUser = data.user ?? null;
      this.user.set(nextUser);
      await this.loadRoleKeys(nextUser?.id ?? null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }

    this.user.set(null);
    this.roleKeys.set([]);
  }

  hasRole(roleKey: string): boolean {
    return this.roleKeys().includes(roleKey);
  }

  private async loadRoleKeys(userId: string | null): Promise<void> {
    if (!userId) {
      this.roleKeys.set([]);
      return;
    }

    const { data: userRoles, error: userRolesError } = await this.schemaClient
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (userRolesError) {
      throw new Error(userRolesError.message);
    }

    const roleIds = (userRoles ?? []).map((role) => role.role_id).filter(Boolean);

    if (roleIds.length === 0) {
      this.roleKeys.set([]);
      return;
    }

    const { data: roles, error: rolesError } = await this.schemaClient
      .from('roles')
      .select('id, key')
      .in('id', roleIds);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    this.roleKeys.set((roles ?? []).map((role) => role.key));
  }
}

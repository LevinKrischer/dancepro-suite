import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
    throw new Error(
      'Supabase ist nicht konfiguriert. Setze supabaseUrl und supabaseAnonKey in src/environments/environment.local.ts.'
    );
  }

  client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  return client;
}

export function getSupabaseSchemaClient(): ReturnType<SupabaseClient['schema']> {
  return getSupabaseClient().schema(environment.supabaseSchema);
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseCredentials() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  return { url, key, isConfigured: Boolean(url && key) };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('[Supabase Init Error]:', err);
      return null;
    }
  }

  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials().isConfigured;
}

export const SUPABASE_SCHEMA_SQL = `-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar Row Level Security (opcional según tus necesidades):
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Política de lectura y escritura para el Service Role o Anon Key:
DROP POLICY IF EXISTS "Allow full access to app_state" ON app_state;
REVOKE ALL ON TABLE app_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_state TO service_role;
`;

/**
 * Guarda el estado completo en la tabla 'app_state' de Supabase
 */
export async function saveToSupabase(data: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('app_state')
      .upsert(
        {
          id: 'appState',
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[Supabase Save Warning]:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('[Supabase Save Exception]:', err?.message || err);
    return false;
  }
}

/**
 * Carga el estado completo desde la tabla 'app_state' de Supabase
 */
export async function loadFromSupabase(): Promise<any | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('app_state')
      .select('data, updated_at')
      .eq('id', 'appState')
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Load Warning]:', error.message);
      return null;
    }

    if (data && data.data) {
      return data.data;
    }

    return null;
  } catch (err: any) {
    console.warn('[Supabase Load Exception]:', err?.message || err);
    return null;
  }
}

/**
 * Verifica la conectividad con Supabase y comprueba si existe la tabla app_state
 */
export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  tableExists: boolean;
  url?: string;
  error?: string;
}> {
  const { url, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return { configured: false, connected: false, tableExists: false };
  }

  const client = getSupabase();
  if (!client) {
    return { configured: true, connected: false, tableExists: false, url, error: 'No se pudo instanciar el cliente Supabase.' };
  }

  try {
    const { error } = await client.from('app_state').select('id').limit(1);
    if (error) {
      // Si el código de error indica que la tabla no existe (42P01 en postgres)
      return {
        configured: true,
        connected: true,
        tableExists: false,
        url,
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      tableExists: true,
      url,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      tableExists: false,
      url,
      error: err?.message || String(err),
    };
  }
}

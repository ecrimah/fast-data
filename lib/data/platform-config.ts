import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import {
  DEFAULT_PLATFORM_CONFIG,
  PLATFORM_CONFIG_KEY,
  normalizePlatformConfig,
  type PlatformConfig,
} from '@/lib/platform/config-types';

export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (!hasSupabaseAdminConfig()) return DEFAULT_PLATFORM_CONFIG;

  const service = createServiceClient();
  const { data, error } = await service
    .from('platform_settings')
    .select('value')
    .eq('key', PLATFORM_CONFIG_KEY)
    .maybeSingle();

  if (error) {
    console.error('[getPlatformConfig]', error);
    return DEFAULT_PLATFORM_CONFIG;
  }

  return normalizePlatformConfig(data?.value);
}

export async function savePlatformConfig(config: PlatformConfig): Promise<void> {
  if (!hasSupabaseAdminConfig()) throw new Error('Database not configured');

  const normalized = normalizePlatformConfig(config);
  const service = createServiceClient();
  const { error } = await service.from('platform_settings').upsert(
    {
      key: PLATFORM_CONFIG_KEY,
      value: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) throw new Error(error.message);
}

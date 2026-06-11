import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

/** Email of the shared guest-checkout profile (created in Supabase). */
export const GUEST_PROFILE_EMAIL = 'guest@fastdataservices.store';

let cachedGuestId: string | null = null;

/**
 * Resolve the profile id used for guest (not-signed-in) checkout/chat orders.
 *
 * Order of resolution:
 *   1. CHAT_GUEST_USER_ID env var (explicit override).
 *   2. The profile whose email is GUEST_PROFILE_EMAIL (auto-discovered + cached),
 *      so guest checkout keeps working even if the env var is missing in prod.
 *
 * Returns null only if neither is available.
 */
export async function getGuestUserId(): Promise<string | null> {
  const fromEnv = process.env.CHAT_GUEST_USER_ID?.trim();
  if (fromEnv) return fromEnv;

  if (cachedGuestId) return cachedGuestId;
  if (!hasSupabaseAdminConfig()) return null;

  const service = createServiceClient();
  const { data } = await service
    .from('profiles')
    .select('id')
    .eq('email', GUEST_PROFILE_EMAIL)
    .maybeSingle();

  cachedGuestId = data?.id ?? null;
  return cachedGuestId;
}

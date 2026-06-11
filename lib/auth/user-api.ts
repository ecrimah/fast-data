import { createClient } from '@supabase/supabase-js';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

type Fail = { ok: false; status: number; error: string };
type Ok = { ok: true; userId: string };

export async function assertUserApi(request: Request): Promise<Fail | Ok> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, status: 503, error: 'Database not configured' };
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user) return { ok: false, status: 401, error: 'Unauthorized' };

  return { ok: true, userId: user.id };
}

export async function userOwnsOrder(userId: string, orderId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service.from('orders').select('user_id').eq('id', orderId).maybeSingle();
  return data?.user_id === userId;
}

import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { fetchAdminNotifications } from '@/lib/data/notifications';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const counts = await fetchAdminNotifications();
  return NextResponse.json(counts);
}

import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { listVisitors, type VisitorIntent, type VisitorStatus } from '@/lib/visitors';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const result = await listVisitors({
    search: url.searchParams.get('search'),
    status: (url.searchParams.get('status') as VisitorStatus | null) || null,
    intent: (url.searchParams.get('intent') as VisitorIntent | null) || null,
    withPhoneOnly: url.searchParams.get('leads') === '1',
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result);
}

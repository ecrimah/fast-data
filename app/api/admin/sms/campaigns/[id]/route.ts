import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { getCampaign, setCampaignStatus } from '@/lib/sms/campaigns';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const result = await getCampaign(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status as 'paused' | 'sending' | 'cancelled';
  if (!['paused', 'sending', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const result = await setCampaignStatus(id, status);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

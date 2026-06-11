import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { sendCampaignBatch } from '@/lib/sms/campaigns';

// Drives the client-side send loop: each call sends the next batch (<=100)
// and reports remaining/done so the admin UI can keep calling until complete.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const batchSize = Math.min(Math.max(Number(body.batchSize ?? 100), 1), 100);

  const result = await sendCampaignBatch(id, batchSize);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

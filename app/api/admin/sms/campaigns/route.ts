import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createCampaign, listCampaigns } from '@/lib/sms/campaigns';
import { resolveSegmentRecipients, type ContactSegment } from '@/lib/sms/contacts';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await listCampaigns();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ campaigns: result.campaigns });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const segment: ContactSegment = body.segment ?? {};

  // Preview mode: just count the resolved audience without creating anything.
  if (body.action === 'preview') {
    const audience = await resolveSegmentRecipients(segment);
    if (!audience.ok) return NextResponse.json({ error: audience.error }, { status: 400 });
    return NextResponse.json({ count: audience.recipients.length });
  }

  const result = await createCampaign({
    name: body.name,
    message: body.message,
    segment,
    senderId: body.senderId,
    appendOptOut: body.appendOptOut,
    scheduledAt: body.scheduledAt ?? null,
    createdBy: auth.userId,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

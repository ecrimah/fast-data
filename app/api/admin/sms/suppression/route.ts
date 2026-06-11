import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { listSuppression, suppressNumber, unsuppressNumber } from '@/lib/sms/suppression';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await listSuppression();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ entries: result.entries });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (!body.phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  const result = await suppressNumber(body.phone, 'manual', body.note);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  const result = await unsuppressNumber(phone);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import {
  importContacts,
  importCustomerContacts,
  listContacts,
  deleteContact,
  contactStats,
  type ContactSegment,
} from '@/lib/sms/contacts';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const segment: ContactSegment = {
    status: (url.searchParams.get('status') as ContactSegment['status']) || undefined,
    network: (url.searchParams.get('network') as ContactSegment['network']) || undefined,
    source: url.searchParams.get('source') || undefined,
    tag: url.searchParams.get('tag') || undefined,
    search: url.searchParams.get('search') || undefined,
  };
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const [list, stats] = await Promise.all([listContacts({ segment, limit, offset }), contactStats()]);
  if (!list.ok) return NextResponse.json({ error: list.error }, { status: 500 });
  return NextResponse.json({
    contacts: list.contacts,
    total: list.total,
    stats: stats.ok ? stats : null,
  });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));

  if (body.action === 'import_customers') {
    const result = await importCustomerContacts();
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (typeof body.blob !== 'string' || !body.blob.trim()) {
    return NextResponse.json({ error: 'Paste some numbers to import' }, { status: 400 });
  }

  const result = await importContacts({
    blob: body.blob,
    source: body.source,
    network: body.network,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const result = await deleteContact(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

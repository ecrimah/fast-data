import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { updateVisitor, deleteVisitor, type VisitorStatus } from '@/lib/visitors';

const STATUSES: VisitorStatus[] = ['new', 'interested', 'contacted', 'converted', 'ignored'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const status = STATUSES.includes(body.status) ? (body.status as VisitorStatus) : undefined;
  const result = await updateVisitor(id, { status, notes: body.notes });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const result = await deleteVisitor(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

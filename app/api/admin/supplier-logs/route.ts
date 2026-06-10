import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import {
  fetchSupplierLogs,
  fetchSupplierSummary,
  fetchAwaitingManualOrders,
  fetchFailedSupplierOrders,
} from '@/lib/data/supplier-logs';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [logs, summary, awaitingManual, failed] = await Promise.all([
    fetchSupplierLogs(100),
    fetchSupplierSummary(),
    fetchAwaitingManualOrders(),
    fetchFailedSupplierOrders(),
  ]);

  return NextResponse.json({ logs, summary, awaitingManual, failed });
}

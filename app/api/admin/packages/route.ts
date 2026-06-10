import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PACKAGE_NETWORKS, type PackageNetwork } from '@/lib/packages/types';

function isNetwork(value: unknown): value is PackageNetwork {
  return typeof value === 'string' && (PACKAGE_NETWORKS as string[]).includes(value);
}

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ packages: [] });

  const service = createServiceClient();
  const { data } = await service
    .from('data_packages')
    .select('*')
    .order('network', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('size_gb', { ascending: true });

  return NextResponse.json({ packages: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json();
  const service = createServiceClient();

  // Bulk generate / reprice a whole network at a per-GB rate.
  if (body.bulk) {
    if (!isNetwork(body.network)) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }
    const pricePerGb = Number(body.pricePerGb);
    const sizes: number[] = Array.isArray(body.sizes) ? body.sizes.map(Number).filter((n: number) => n > 0) : [];
    if (!pricePerGb || pricePerGb <= 0 || sizes.length === 0) {
      return NextResponse.json({ error: 'Provide a price/GB and at least one size' }, { status: 400 });
    }

    const rows = sizes.map((size, i) => ({
      network: body.network,
      size_gb: size,
      price: +(size * pricePerGb).toFixed(2),
      sort_order: i + 1,
      active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await service
      .from('data_packages')
      .upsert(rows, { onConflict: 'network,size_gb' });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, count: rows.length });
  }

  // Single create.
  if (!isNetwork(body.network)) {
    return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
  }
  const sizeGb = Number(body.size_gb);
  const price = Number(body.price);
  if (!sizeGb || sizeGb <= 0 || price < 0) {
    return NextResponse.json({ error: 'Invalid size or price' }, { status: 400 });
  }

  const { data, error } = await service
    .from('data_packages')
    .insert({
      network: body.network,
      size_gb: sizeGb,
      price,
      label: body.label?.trim() || null,
      active: body.active ?? true,
      popular: body.popular ?? false,
      sort_order: Number(body.sort_order) || 0,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505' ? 'A package with this network and size already exists' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ package: data });
}

export async function PATCH(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Package id required' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.size_gb !== undefined) patch.size_gb = Number(body.size_gb);
  if (body.label !== undefined) patch.label = body.label?.trim() || null;
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.popular !== undefined) patch.popular = Boolean(body.popular);
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  const service = createServiceClient();
  const { data, error } = await service
    .from('data_packages')
    .update(patch)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ package: data });
}

export async function DELETE(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Package id required' }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from('data_packages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

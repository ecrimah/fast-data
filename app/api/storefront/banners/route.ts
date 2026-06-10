import { NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/data/platform-config';

export async function GET() {
  const config = await getPlatformConfig();
  const banners = config.shopBanners.filter((b) => b.active);
  return NextResponse.json({ banners });
}

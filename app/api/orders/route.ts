import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { search = '', offset = '0' } = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const { orders, newOffset, totalOrders } = await getOrders(search as string, Number(offset));
    return NextResponse.json({ orders, newOffset, totalOrders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getOrders, saveOrder } from '@/lib/db';
import { Order } from '@types';

export async function GET(req: NextRequest) {
  const {
    search,
    offset = '0',
    limit,
    status
  } = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const { orders, newOffset, totalOrders } = await getOrders(
      search as string,
      Number(offset),
      Number(limit),
      status
    );
    return NextResponse.json({ orders, newOffset, totalOrders });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const order: Order = await req.json();

  console.log('Received order:', order);

  const orderCreated = await saveOrder(order);

  return NextResponse.json(orderCreated);
}

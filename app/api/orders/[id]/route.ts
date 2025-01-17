import { NextRequest, NextResponse } from 'next/server';
import { updateOrder } from '@/lib/db';
import { Order } from '@types';

export async function PATCH(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const orderId = Number(pathname.split('/').pop());

  if (!orderId) {
    return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
  }

  const order: Order = await req.json();

  console.log('Received order:', order);

  try {
    await updateOrder(order, orderId);
    return NextResponse.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ message: 'Failed to update order' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db, updateOrder, orders } from '@/lib/db';
import { Order, UpdateOrderFormData, updateOrderFormSchema } from '@types';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const orderId = Number(pathname.split('/').pop());
  try {
    if (isNaN(orderId)) {
      return NextResponse.json(
        { message: 'Invalid Order ID' },
        { status: 400 }
      );
    }

    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(orderResult[0]);
  } catch (error) {
    console.error(`API Error fetching order ${orderId}:`, error);
    return NextResponse.json(
      { message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const orderId = Number(pathname.split('/').pop());

  if (!orderId) {
    return NextResponse.json(
      { message: 'Order ID is required' },
      { status: 400 }
    );
  }

  const orderInput: unknown = await req.json();

  const validationResult = updateOrderFormSchema.safeParse(orderInput);

  if (!validationResult.success) {
    console.error(
      'API Order PATCH Validation Error:',
      validationResult.error.format()
    );
    return NextResponse.json(
      {
        message: 'Invalid input data',
        errors: validationResult.error.format()
      },
      { status: 400 }
    );
  }

  const validatedData: UpdateOrderFormData = validationResult.data;
  console.log('Validated order update data:', validatedData);

  try {
    const res = await updateOrder(validatedData, orderId);
    return NextResponse.json(res);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { message: 'Failed to update order' },
      { status: 500 }
    );
  }
}

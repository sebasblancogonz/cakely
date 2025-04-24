// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrders, saveOrder } from '@/lib/db';
import { createOrderFormSchema, OrderFormData, OrderStatus } from '@types';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('q') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const status = searchParams.get('status');

  try {
    const { orders, newOffset, totalOrders } = await getOrders(
      businessId,
      search,
      offset,
      limit,
      status
    );
    return NextResponse.json({ orders, newOffset, totalOrders });
  } catch (error: any) {
    console.error(
      `API Error fetching orders for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch orders', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const orderInput: unknown = await request.json();

    const validationResult = createOrderFormSchema.safeParse(orderInput);

    if (!validationResult.success) {
      console.error(
        'API Order POST Validation Error:',
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

    const dataToSave: OrderFormData & {
      businessId: number;
      orderStatus: OrderStatus;
    } = {
      ...validationResult.data,
      businessId: businessId,
      orderStatus: OrderStatus.pending
    };

    console.log('Received and validated order data for save:', dataToSave);

    const orderCreated = await saveOrder(dataToSave);

    return NextResponse.json(orderCreated, { status: 201 });
  } catch (error: any) {
    console.error(
      `API Error creating order for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to create order', error: error.message },
      { status: 500 }
    );
  }
}

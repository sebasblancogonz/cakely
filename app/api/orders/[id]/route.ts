// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, updateOrder, orders } from '@/lib/db';
import { UpdateOrderFormData, updateOrderFormSchema } from '@types';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { params } = context;
  try {
    const orderId = parseInt(params.id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { message: 'Invalid Order ID' },
        { status: 400 }
      );
    }

    const orderResult = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.businessId, businessId)),
      with: {
        customer: true
      }
    });

    if (!orderResult) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(orderResult);
  } catch (error) {
    console.error(
      `API Error fetching order ${params.id} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { params } = context;
  try {
    const orderId = parseInt(params.id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { message: 'Invalid Order ID' },
        { status: 400 }
      );
    }

    const orderInput: unknown = await request.json();

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
    console.log(
      'Validated order update data for business',
      businessId,
      ':',
      validatedData
    );

    const updatedOrder = await updateOrder(businessId, validatedData, orderId);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error(
      `Error updating order ${params.id} for business ${businessId}:`,
      error
    );
    let status = 500;
    let message = 'Failed to update order';
    if (error.message?.includes('Invalid input data')) {
      status = 400;
      message = 'Invalid input data provided.';
    } else if (error.message?.includes('not found')) {
      status = 404;
      message = 'Order not found or not authorized.';
    }
    return NextResponse.json(
      { message: message, error: error.message },
      { status: status }
    );
  }
}

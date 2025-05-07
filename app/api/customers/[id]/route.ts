import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer, db, customers, deleteCustomerById } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import {
  UpdateCustomerFormData,
  updateCustomerSchema
} from '@/lib/validators/customers';
import { checkPermission, getSessionInfo } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const customerId = Number(pathname.split('/').pop());
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    if (isNaN(customerId)) {
      return NextResponse.json(
        { message: 'Invalid Customer ID' },
        { status: 400 }
      );
    }

    const customerResult = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId))
      )
      .limit(1);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(customerResult[0]);
  } catch (error) {
    console.error(`API Error fetching customer ${customerId}:`, error);
    return NextResponse.json(
      { message: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId, businessId } = sessionInfo;

  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  const { pathname } = request.nextUrl;
  const customerId = Number(pathname.split('/').pop());

  try {
    if (isNaN(customerId)) {
      return NextResponse.json(
        { message: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    await deleteCustomerById(businessId, customerId);
    return NextResponse.json(
      { message: 'Customer deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `API Error deleting customer ${customerId} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = req.nextUrl;
  const customerId = Number(pathname.split('/').pop());

  try {
    if (!customerId) {
      return NextResponse.json(
        { message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = updateCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        { message: 'No fields provided for update' },
        { status: 400 }
      );
    }

    const validatedData: UpdateCustomerFormData = validation.data;

    console.log('Received customer:', validatedData);

    const updatedCustomer = await updateCustomer(
      businessId,
      validatedData,
      customerId
    );
    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    console.error(
      `Error updating customer ${customerId} for business ${businessId}:`,
      error
    );
    let status = 500;
    let message = 'Failed to update customer';
    if (error.message?.includes('Invalid input data')) {
      status = 400;
      message = 'Invalid input data provided.';
    } else if (error.message?.includes('not found')) {
      status = 404;
      message = 'Customer not found or not authorized.';
    }
    return NextResponse.json(
      { message: message, error: error.message },
      { status: status }
    );
  }
}

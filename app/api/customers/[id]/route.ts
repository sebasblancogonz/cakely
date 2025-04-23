import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer, db, customers } from '@/lib/db';
import { Customer } from '@types';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const customerId = Number(pathname.split('/').pop());

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
      .where(eq(customers.id, customerId))
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

export async function PATCH(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const customerId = Number(pathname.split('/').pop());

  if (!customerId) {
    return NextResponse.json(
      { message: 'Customer ID is required' },
      { status: 400 }
    );
  }

  const customer: Customer = await req.json();

  console.log('Received customer:', customer);

  try {
    await updateCustomer(customer, customerId);
    return NextResponse.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { message: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

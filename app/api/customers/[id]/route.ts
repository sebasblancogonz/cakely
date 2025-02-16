import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer } from '@/lib/db';
import { Customer } from '@types';

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

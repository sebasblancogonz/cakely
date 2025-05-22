import { NextRequest, NextResponse } from 'next/server';

import { getCustomers, saveCustomer } from '@/lib/db';
import { Customer } from '@/types/types';
import { auth } from '@/lib/auth';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';
import { withApiProtection } from '@/lib/api/withApiProtection';

async function getCustomersHandler(
  req: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { session, businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const {
    search = '',
    offset = '0',
    limit = '5'
  } = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const { customers, newOffset, totalCustomers } = await getCustomers(
      businessId,
      search as string,
      Number(offset),
      Number(limit)
    );

    return NextResponse.json({ customers, newOffset, totalCustomers });
  } catch (error) {
    console.error(
      `API Error fetching customers for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(getCustomersHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function createCustomerHandler(
  req: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { session, businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    const customer: Omit<Customer, 'id' | 'registrationDate' | 'orders'> = body;

    const customerCreated = await saveCustomer(businessId, customer);

    return NextResponse.json(customerCreated, { status: 201 });
  } catch (error: any) {
    console.error(
      `API Error creating customer for business ${businessId}:`,
      error
    );

    return NextResponse.json(
      { message: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(createCustomerHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

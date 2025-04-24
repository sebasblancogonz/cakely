import { NextRequest, NextResponse } from 'next/server';

import { getCustomers, saveCustomer } from '@/lib/db';
import { Customer } from '@/types/types';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { search = '', offset = '0' } = Object.fromEntries(
    req.nextUrl.searchParams
  );

  try {
    const { customers, newOffset, totalCustomers } = await getCustomers(
      businessId,
      search as string,
      Number(offset),
      businessId
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

export async function POST(req: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

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

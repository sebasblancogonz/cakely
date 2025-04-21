import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, saveCustomer } from '@/lib/db';
import { Customer } from '@/types/types';

export async function GET(req: NextRequest) {
  const { search = '', offset = '0' } = Object.fromEntries(
    req.nextUrl.searchParams
  );

  try {
    const { customers, newOffset, totalCustomers } = await getCustomers(
      search as string,
      Number(offset)
    );
    return NextResponse.json({ customers, newOffset, totalCustomers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer: Customer = await req.json();

    const customerCreated = await saveCustomer(customer);

    return NextResponse.json(customerCreated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

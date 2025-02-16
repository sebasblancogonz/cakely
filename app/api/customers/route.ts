import { NextRequest, NextResponse } from 'next/server';
import { getCustomers } from '@/lib/db';

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

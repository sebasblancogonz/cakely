import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urls, orderId } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { message: 'Missing or invalid URLs' },
        { status: 400 }
      );
    }

    if (typeof orderId !== 'number') {
      return NextResponse.json(
        { message: 'orderId must be a number' },
        { status: 400 }
      );
    }

    console.log(`📦 Images for order ${orderId}:`);
    urls.forEach((url, index) => {
      console.log(`  [${index + 1}] ${url}`);
    });

    return NextResponse.json({ message: 'URLs saved successfully' });
  } catch (error) {
    console.error('Error saving URLs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

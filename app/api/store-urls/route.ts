import { NextRequest, NextResponse } from 'next/server';
import { db, saveImageUrlsForOrder } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('from the backend');
    const body = await req.json();
    const { urls, orderId } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      console.log(urls);
      return NextResponse.json(
        { message: 'Missing or invalid URLs' },
        { status: 400 }
      );
    }

    if (typeof orderId !== 'number') {
      console.log(orderId);
      return NextResponse.json(
        { message: 'orderId must be a number' },
        { status: 400 }
      );
    }

    console.log(`📦 Storing mages for order ${orderId}:`);
    saveImageUrlsForOrder(orderId, urls);

    return NextResponse.json({ message: 'URLs saved successfully' });
  } catch (error) {
    console.error('Error saving URLs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

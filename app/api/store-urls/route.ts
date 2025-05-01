import { NextRequest, NextResponse } from 'next/server';
import { db, saveImageUrlsForOrder } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { urls, orderId } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      console.log('Invalid URLs received:', urls);
      return NextResponse.json(
        { message: 'Missing or invalid URLs' },
        { status: 400 }
      );
    }

    if (
      !urls.every(
        (url) =>
          typeof url === 'string' ||
          (typeof url === 'object' && typeof url?.url === 'string')
      )
    ) {
      console.log('Invalid URL format in array:', urls);
      return NextResponse.json(
        { message: 'Invalid URL format in array' },
        { status: 400 }
      );
    }

    if (typeof orderId !== 'number' || isNaN(orderId)) {
      console.log('Invalid orderId received:', orderId);
      return NextResponse.json(
        { message: 'orderId must be a valid number' },
        { status: 400 }
      );
    }

    console.log(
      `📦 Storing images for business ${businessId}, order ${orderId}:`
    );

    await saveImageUrlsForOrder(businessId, orderId, urls);

    return NextResponse.json({ message: 'URLs saved successfully' });
  } catch (error: any) {
    console.error(`Error saving URLs for business ${businessId}:`, error);

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { message: 'Order not found or not authorized' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

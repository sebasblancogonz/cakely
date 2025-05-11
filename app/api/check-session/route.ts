import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://cakely.es', 'http://localhost:3001'];

  const headers = new Headers();
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const session = await auth();
    if (session?.user) {
      return NextResponse.json(
        {
          isAuthenticated: true,
          user: {
            name: session.user.name,
            email: session.user.email,
            image: session.user.image
          }
        },
        { headers }
      );
    } else {
      return NextResponse.json({ isAuthenticated: false }, { headers });
    }
  } catch (error) {
    console.error('[API Check Session] Error:', error);
    return NextResponse.json(
      { isAuthenticated: false, error: 'Server error' },
      { status: 500, headers }
    );
  }
}

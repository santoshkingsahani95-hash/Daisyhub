import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextAuthCallback = new URL('/api/auth/callback/google', request.url);
  url.searchParams.forEach((value, key) => {
    nextAuthCallback.searchParams.set(key, value);
  });
  return NextResponse.redirect(nextAuthCallback);
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get('redirect') || '/account';
  const signinUrl = new URL('/api/auth/signin/google', request.url);
  signinUrl.searchParams.set('callbackUrl', callbackUrl);
  return NextResponse.redirect(signinUrl);
}

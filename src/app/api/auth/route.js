import { NextResponse } from 'next/server';

export async function POST(request) {
  const { password } = await request.json();

  if (password === process.env.DASHBOARD_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('tt_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.DEV_AUTH_SECRET);

export async function devAuthMiddleware(request: NextRequest) {
  const devToken = request.cookies.get(
    `${process.env.DEV_AUTH_PROJECT_NAME}-devAccessToken`
  )?.value;

  if (!devToken) {
    return NextResponse.redirect(new URL('/dev-auth', request.url));
  }

  try {
    const { payload } = await jwtVerify(devToken, JWT_SECRET);
    if (payload.type !== 'access') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.next();
}

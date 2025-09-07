'use server';

import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.DEV_AUTH_SECRET);

export async function login({
  key,
}: {
  key: string;
}): Promise<{ success: boolean }> {
  const cookieStore = await cookies();

  // Get list of keys from environment variable
  const authKeysString = process.env.DEV_AUTH_KEYS ?? '';
  const validKeys = authKeysString
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (validKeys.includes(key)) {
    const accessToken = await new SignJWT({
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`1w`)
      .sign(JWT_SECRET);

    cookieStore.set(
      `${process.env.DEV_AUTH_PROJECT_NAME}-devAccessToken`,
      accessToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
      }
    );
    return { success: true };
  }
  return { success: false };
}

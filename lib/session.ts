import { type Context } from '@recommand/lib/api';
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { getSignedCookie, setSignedCookie, deleteCookie } from '@recommand/lib/api/cookie';

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set");
}

const key = new TextEncoder().encode(process.env.JWT_SECRET);

const cookie = {
  name: "session",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
  },
  duration: 24 * 60 * 60 * 1000, // 24 hours
};

export async function encrypt(payload: JWTPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1day")
    .sign(key);
}

export async function decrypt(session: string | Uint8Array) {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(c: Context, user: { id: string; isAdmin: boolean }) {
  const expires = new Date(Date.now() + cookie.duration);
  const session = await encrypt({
    userId: user.id,
    isAdmin: user.isAdmin,
    expires,
  });

  await setSignedCookie(c, cookie.name, session, process.env.JWT_SECRET!, {
    ...cookie.options,
    expires,
  });
}

export async function verifySession(c: Context): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const sessionCookie = await getSignedCookie(c, process.env.JWT_SECRET!, cookie.name);
  if (!sessionCookie) return null;
  
  const session = await decrypt(sessionCookie);
  if (!session?.userId) {
    return null;
  }
  
  return {
    userId: session.userId as string,
    isAdmin: session.isAdmin as boolean,
  };
}

export async function deleteSession(c: Context) {
  deleteCookie(c, cookie.name, cookie.options);
}

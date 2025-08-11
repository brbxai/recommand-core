import { type Context } from "@recommand/lib/api";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import {
  getSignedCookie,
  setSignedCookie,
  deleteCookie,
} from "@recommand/lib/api/cookie";
import { checkApiKey, type ApiKey } from "@core/data/api-keys";

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

export async function createSession(
  c: Context,
  user: { id: string; isAdmin: boolean }
) {
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
  apiKey?: ApiKey;
} | null> {
  let result: { userId: string; isAdmin: boolean; apiKey?: ApiKey } | null = null;

  const sessionCookie = await getSignedCookie(
    c,
    process.env.JWT_SECRET!,
    cookie.name
  );

  if (sessionCookie) {
    const session = await decrypt(sessionCookie);
    if (!session?.userId) {
      return null;
    }
    result = {
      userId: session.userId as string,
      isAdmin: session.isAdmin as boolean,
      apiKey: undefined,
    };
  } else {
    // We will try api keys next (Basic token auth)
    const encodedCredentials = c.req.header("Authorization")?.split(" ")[1];
    if (encodedCredentials) {
      const credentials = Buffer.from(encodedCredentials, "base64").toString(
        "utf-8"
      );
      const [apiKeyId, secret] = credentials.split(":");
      const apiKey = await checkApiKey(apiKeyId, secret);
      if (apiKey) {
        result = { userId: apiKey.user.id, isAdmin: apiKey.user.isAdmin, apiKey: apiKey.apiKey };
      }
    }
  }

  if (!result) return null;

  // Add user to context
  c.set("user", {
    id: result.userId as string,
    isAdmin: result.isAdmin as boolean,
  });

  // Add api key to context
  if (result.apiKey) {
    c.set("apiKey", {
      id: result.apiKey.id,
      teamId: result.apiKey.teamId,
    });
  }

  return result;
}

export async function deleteSession(c: Context) {
  deleteCookie(c, cookie.name, cookie.options);
}

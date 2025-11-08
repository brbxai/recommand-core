import { type Context } from "@recommand/lib/api";
import {
  getSignedCookie,
  setSignedCookie,
  deleteCookie,
} from "@recommand/lib/api/cookie";
import { checkApiKey, getApiKey, type ApiKey } from "@core/data/api-keys";
import { checkBasicAuth } from "@core/data/users";
import { verify, sign } from "./jwt";
import { addMilliseconds } from "date-fns";
import { db } from "@recommand/db";
import { users } from "@core/db/schema";
import { eq } from "drizzle-orm";


const cookie = {
  name: "session",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
  },
  duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};


export async function createSession(
  c: Context,
  user: { id: string; isAdmin: boolean }
) {
  const expires = addMilliseconds(new Date(), cookie.duration);
  const session = await sign({
    userId: user.id,
    isAdmin: user.isAdmin,
    expires,
  }, expires);

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

  if(!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  const sessionCookie = await getSignedCookie(
    c,
    process.env.JWT_SECRET!,
    cookie.name
  );

  if (sessionCookie) {
    const session = await verify(sessionCookie);
    if (!session?.userId) {
      return null;
    }
    result = {
      userId: session.userId as string,
      isAdmin: session.isAdmin as boolean,
      apiKey: undefined,
    };
  } else {
    // We will try api keys next (Basic auth or JWT auth)
    const authorizationHeader = c.req.header("Authorization")?.split(" ");
    if(!authorizationHeader || authorizationHeader.length !== 2) {
      return null;
    }

    const authorizationType = authorizationHeader[0];
    const encodedCredentials = authorizationHeader[1];

    if(!authorizationType.trim() || !encodedCredentials.trim()){
      return null;
    }
 
    
    if (authorizationType === "Bearer") {
      const jwtPayload = await verify(encodedCredentials);
      if(!jwtPayload?.sub || !jwtPayload.jti || !jwtPayload.teamId){
        return null;
      }

      // Cross-check the JWT with the database to ensure it has not been revoked and is fully valid
      const apiKey = await getApiKey(jwtPayload.jti as string);
      if(!apiKey || apiKey.expiresAt && apiKey.expiresAt < new Date() || apiKey.type !== "jwt" || apiKey.teamId !== jwtPayload.teamId) {
        return null;
      }

      let isAdmin = false;
      if(jwtPayload.isAdmin){
        // Double check with the database to ensure the user is an admin, as an extra security measure
        const user = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, jwtPayload.sub as string)).limit(1);
        if(user.length === 0 || !user[0].isAdmin){
          return null;
        }
        isAdmin = user[0].isAdmin;
      }

      result = {
        userId: jwtPayload.sub as string,
        isAdmin,
        apiKey,
      }
      
    }else if (authorizationType === "Basic") {
      const credentials = Buffer.from(encodedCredentials, "base64").toString("utf-8");
      const [apiKeyId, secret] = credentials.split(":");
      const apiKey = await checkApiKey(apiKeyId, secret);
      if (apiKey) {
        result = { userId: apiKey.user.id, isAdmin: apiKey.user.isAdmin, apiKey: apiKey.apiKey };
      }
    }
  } 
  if (!result) {
    // We will try basic auth next
    const basicAuth = c.req.header("Authorization")?.split(" ")[1];
    if (basicAuth) {
      const credentials = Buffer.from(basicAuth, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      const userInfo = await checkBasicAuth(username, password);
      if (userInfo.user) {
        result = { userId: userInfo.user.id, isAdmin: userInfo.user.isAdmin, apiKey: undefined };
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

import { apiKeys, users } from "@core/db/schema";
import { db } from "@recommand/db";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { addSeconds } from "date-fns";
import { sign } from "@core/lib/jwt";
import { ulid } from "ulid";

export type ApiKey = typeof apiKeys.$inferSelect;

export async function getApiKeys(userId: string, teamId: string) {
    return await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.teamId, teamId)));
}

export async function getApiKey(apiKeyId: string) {
    const res = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, apiKeyId));
    if (res.length === 0) {
        return null;
    }
    return res[0];
}

export async function createApiKey(userId: string, teamId: string, name: string) {
    const secret = crypto.randomUUID();
    const readableSecret = "secret_" + secret.replace(/-/g, "");
    const secretHash = await bcrypt.hash(readableSecret, 10);

    const res = await db
        .insert(apiKeys)
        .values({ userId, teamId, name, type: "basic", secretHash })
        .returning();

    return {
        ...res[0],
        secret: readableSecret,
    };
    
}

export async function createJwtApiKey(user: { id: string; isAdmin: boolean }, teamId: string, expiresInSeconds: number, name: string) {
    const expires = addSeconds(new Date(), expiresInSeconds);
    const id = "key_" + ulid();
    const jwt = await sign({
        sub: user.id,
        jti: id,
        isAdmin: user.isAdmin,
        teamId,
    }, expires);
    const res = await db
        .insert(apiKeys)
        .values({ id, userId: user.id, teamId, name, type: "jwt", secretHash: "", expiresAt: expires })
        .returning();
    return {
        ...res[0],
        jwt,
    };
}

export async function checkApiKey(apiKeyId: string, secret: string) {
    const res = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.type, "basic")))
        .innerJoin(users, eq(apiKeys.userId, users.id));

    if (res.length === 0) {
        return null;
    }

    const apiKey = res[0];

    if(!apiKey.api_keys.secretHash){
        return null;
    }

    // Check if the secret is correct
    const isSecretCorrect = await bcrypt.compare(secret, apiKey.api_keys.secretHash);
    if (!isSecretCorrect) {
        return null;
    }

    return {
        user: apiKey.users,
        apiKey: apiKey.api_keys,
    };
}

export async function deleteApiKey(userId: string, teamId: string, apiKeyId: string) {
    return await db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId), eq(apiKeys.teamId, teamId)));
}
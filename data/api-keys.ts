import { apiKeys } from "@core/db/schema";
import { db } from "@recommand/db";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export type ApiKey = typeof apiKeys.$inferSelect;

export async function getApiKeys(userId: string, teamId: string) {
    return await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.teamId, teamId)));
}

export async function createApiKey(userId: string, teamId: string, name: string) {
    const secret = crypto.randomUUID();
    const readableSecret = "secret_" + secret.replace(/-/g, "");
    const secretHash = await bcrypt.hash(readableSecret, 10);

    const res = await db
        .insert(apiKeys)
        .values({ userId, teamId, name, secretHash })
        .returning();

    return {
        ...res[0],
        secret: readableSecret,
    };
    
}

export async function deleteApiKey(userId: string, teamId: string, apiKeyId: string) {
    return await db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId), eq(apiKeys.teamId, teamId)));
}
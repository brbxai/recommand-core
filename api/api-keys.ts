import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getCurrentUser } from "data/users";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { createApiKey, deleteApiKey, getApiKeys } from "@core/data/api-keys";

const server = new Server();

const _getApiKeys = server.get(
  "/:teamId/api-keys",
  zValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const apiKeys = await getApiKeys(user.id, c.req.param("teamId"));
    return c.json(actionSuccess({
      apiKeys,
    }));
  }
);

const _createApiKey = server.post(
  "/:teamId/api-keys",
  zValidator("param", z.object({
    teamId: z.string(),
  })),
  zValidator("json", z.object({
    name: z.string(),
  })),
  async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const apiKey = await createApiKey(user.id, c.req.param("teamId"), c.req.valid("json").name);
    return c.json(actionSuccess({apiKey}));
  }
);

const _deleteApiKey = server.delete(
  "/:teamId/api-keys/:apiKeyId",
  zValidator("param", z.object({
    teamId: z.string(),
    apiKeyId: z.string(),
  })),
  async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    await deleteApiKey(user.id, c.req.param("teamId"), c.req.param("apiKeyId"));
    return c.json(actionSuccess());
  }
);


export type ApiKeys = typeof _getApiKeys | typeof _createApiKey | typeof _deleteApiKey;

export default server;

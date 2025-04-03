import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { createApiKey, deleteApiKey, getApiKeys } from "@core/data/api-keys";
import { requireTeamAccess } from "@core/lib/auth-middleware";

const server = new Server();

const _getApiKeys = server.get(
  "/:teamId/api-keys",
  requireTeamAccess(),
  zValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    const apiKeys = await getApiKeys(c.var.user.id, c.var.team.id);
    return c.json(
      actionSuccess({
        apiKeys,
      })
    );
  }
);

const _createApiKey = server.post(
  "/:teamId/api-keys",
  requireTeamAccess(),
  zValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  zValidator(
    "json",
    z.object({
      name: z.string(),
    })
  ),
  async (c) => {
    const apiKey = await createApiKey(
      c.var.user.id,
      c.var.team.id,
      c.req.valid("json").name
    );
    return c.json(actionSuccess({ apiKey }));
  }
);

const _deleteApiKey = server.delete(
  "/:teamId/api-keys/:apiKeyId",
  requireTeamAccess(),
  zValidator(
    "param",
    z.object({
      teamId: z.string(),
      apiKeyId: z.string(),
    })
  ),
  async (c) => {
    await deleteApiKey(c.var.user.id, c.var.team.id, c.req.param("apiKeyId"));
    return c.json(actionSuccess());
  }
);

export type ApiKeys =
  | typeof _getApiKeys
  | typeof _createApiKey
  | typeof _deleteApiKey;

export default server;

import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { createApiKey, deleteApiKey, getApiKeys } from "@core/data/api-keys";
import { requireTeamAccess } from "@core/lib/auth-middleware";

const server = new Server();

const _getApiKeys = server.get(
  "/:teamId/api-keys",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    try {
      const apiKeys = await getApiKeys(c.var.user.id, c.var.team.id);
      return c.json(
        actionSuccess({
        apiKeys,
      })
    );
  } catch (error) {
      return c.json(actionFailure(error as Error), 500);
    }
  }
);

const _createApiKey = server.post(
  "/:teamId/api-keys",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  zodValidator(
    "json",
    z.object({
      name: z.string(),
    })
  ),
  async (c) => {
    try {
      const apiKey = await createApiKey(
        c.get("user").id,
        c.get("team").id,
        c.req.valid("json").name
      );
      return c.json(actionSuccess({ apiKey }));
    } catch (error) {
      return c.json(actionFailure(error as Error), 500);
    }
  }
);

const _deleteApiKey = server.delete(
  "/:teamId/api-keys/:apiKeyId",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      apiKeyId: z.string(),
    })
  ),
  async (c) => {
    try {
      await deleteApiKey(c.var.user.id, c.var.team.id, c.req.param("apiKeyId"));
      return c.json(actionSuccess());
    } catch (error) {
      return c.json(actionFailure(error as Error), 500);
    }
  }
);

export type ApiKeys =
  | typeof _getApiKeys
  | typeof _createApiKey
  | typeof _deleteApiKey;

export default server;

import { createMiddleware } from "hono/factory";
import type { AuthenticatedUserContext } from "../auth-middleware";
import { actionFailure } from "@recommand/lib/utils";
import { getRegisteredPermission } from ".";
import { hasPermission } from "@core/data/permissions";

export function requirePermission(permissionId: string) {
  return createMiddleware<AuthenticatedUserContext>(async (c, next) => {
    const user = c.var.user;
    if (!user) {
      return c.json(actionFailure("Unauthorized"), 401);
    }
    const teamId = c.get("team")?.id;
    if (!teamId) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const permission = getRegisteredPermission(permissionId);
    if (!permission) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const hasPermissionResult = await hasPermission(user.id, teamId, permission.id);
    if (!hasPermissionResult) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    await next();
  });
}
import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { requireTeamAccess } from "@core/lib/auth-middleware";
import {
  grantPermission,
  revokePermission,
  hasPermission,
  getUserPermissionsForTeam,
  getGrantablePermissions,
  PermissionNotRegisteredError,
  NotAuthorizedError,
} from "@core/data/permissions";
import { getRegisteredPermissions } from "@core/lib/permissions";
import { requirePermission } from "@core/lib/permissions/permission-middleware";

const server = new Server();

const _getPermissions = server.get(
  "/auth/teams/:teamId/permissions",
  requireTeamAccess(),
  requirePermission("core.team.manage"),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    try {
      const teamId = c.get("team").id;
      const actorUserId = c.var.user?.id;
      if (!actorUserId) {
        return c.json(actionFailure("User ID is required"), 400);
      }

      const allPermissions = getRegisteredPermissions();
      const grantablePermissions = await getGrantablePermissions(actorUserId, teamId);
      return c.json(actionSuccess({
        permissions: allPermissions.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          isGrantable: grantablePermissions.some((gp) => gp.id === p.id),
        }))
      }));
    } catch (error) {
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _getUserPermissions = server.get(
  "/auth/teams/:teamId/members/:userId/permissions",
  requireTeamAccess(),
  requirePermission("core.team.manage"),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      userId: z.string(),
    })
  ),
  async (c) => {
    try {
      const { userId } = c.req.valid("param");
      const teamId = c.get("team").id;

      const permissions = await getUserPermissionsForTeam(userId, teamId);
      return c.json(actionSuccess({ permissions }));
    } catch (error) {
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _checkPermission = server.get(
  "/auth/teams/:teamId/members/:userId/permissions/:permissionId",
  requireTeamAccess(),
  requirePermission("core.team.manage"),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      userId: z.string(),
      permissionId: z.string(),
    })
  ),
  async (c) => {
    try {
      const { userId, permissionId } = c.req.valid("param");
      const teamId = c.get("team").id;

      const has = await hasPermission(userId, teamId, permissionId);
      return c.json(actionSuccess({ hasPermission: has }));
    } catch (error) {
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _grantPermission = server.post(
  "/auth/teams/:teamId/members/:userId/permissions",
  requireTeamAccess(),
  requirePermission("core.team.manage"),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      userId: z.string(),
    })
  ),
  zodValidator(
    "json",
    z.object({
      permissionId: z.string(),
    })
  ),
  async (c) => {
    try {
      const { userId } = c.req.valid("param");
      const { permissionId } = c.req.valid("json");
      const teamId = c.get("team").id;
      const actorUserId = c.var.user?.id;
      if (!actorUserId) {
        return c.json(actionFailure("User ID is required"), 400);
      }

      const permission = await grantPermission(userId, teamId, permissionId, actorUserId);
      return c.json(actionSuccess({ permission }));
    } catch (error) {
      if (error instanceof PermissionNotRegisteredError) {
        return c.json(actionFailure(error.message), 400);
      }
      if (error instanceof NotAuthorizedError) {
        return c.json(actionFailure(error.message), 403);
      }
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _revokePermission = server.delete(
  "/auth/teams/:teamId/members/:userId/permissions/:permissionId",
  requireTeamAccess(),
  requirePermission("core.team.manage"),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      userId: z.string(),
      permissionId: z.string(),
    })
  ),
  async (c) => {
    try {
      const { userId, permissionId } = c.req.valid("param");
      const teamId = c.get("team").id;
      const actorUserId = c.var.user?.id;
      if (!actorUserId) {
        return c.json(actionFailure("User ID is required"), 400);
      }

      const wasRevoked = await revokePermission(userId, teamId, permissionId, actorUserId);
      if (!wasRevoked) {
        return c.json(actionFailure("Permission not found"), 404);
      }
      return c.json(actionSuccess());
    } catch (error) {
      if (error instanceof PermissionNotRegisteredError) {
        return c.json(actionFailure(error.message), 400);
      }
      if (error instanceof NotAuthorizedError) {
        return c.json(actionFailure(error.message), 403);
      }
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

export type Permissions =
  | typeof _getPermissions
  | typeof _getUserPermissions
  | typeof _checkPermission
  | typeof _grantPermission
  | typeof _revokePermission;

export default server;

import type { Context, MiddlewareHandler, Next } from "hono";
import { verifySession } from "./session";
import { actionFailure } from "@recommand/lib/utils";
import { getTeam, isMember, type Team } from "@core/data/teams";

export type AuthenticatedContext = {
  Variables: {
    user: {
      id: string;
      isAdmin: boolean;
    };
    team: Team | undefined;
  };
};

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    // Verify user's session
    const session = await verifySession(c);
    // Fetch user data
    if (!session?.userId) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    // Successfully authenticated, continue to next middleware
    await next();
  };
}

type TeamAccessOptions = {
  param?: string;
  getTeamId?: (c: Context) => string;
};

export function requireTeamAccess(
  options: TeamAccessOptions = {}
): MiddlewareHandler {
  return async (c, next) => {
    // Verify user's session
    await verifySession(c);

    // Get user from context
    const user: { id: string; isAdmin: boolean } | null = c.get("user");
    if (!user?.id) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const teamId = options.getTeamId
      ? options.getTeamId(c)
      : c.req.param(options.param ?? "teamId");
    if (!teamId) {
      return c.json(actionFailure("Team ID is required"), 400);
    }

    if (!(await isMember(user.id, teamId))) {
      return c.json(actionFailure("Unauthorized"), 401);
    }

    const team = await getTeam(teamId);
    if (!team) {
      return c.json(actionFailure("Team not found"), 404);
    }
    c.set("team", team);

    await next();
  };
}

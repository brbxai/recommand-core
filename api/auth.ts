import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createUser, getCurrentUser } from "data/users";
import { createSession, deleteSession } from "lib/session";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { db } from "@recommand/db";
import { users } from "@core/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createTeam, getUserTeams } from "@core/data/teams";
import { requireAuth } from "@core/lib/auth-middleware";
import { getCompletedOnboardingSteps } from "@core/data/onboarding";

const server = new Server();

const login = server.post(
  "/auth/login",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // Find user and verify password
      const matchingUsers = await db
        .select({
          id: users.id,
          isAdmin: users.isAdmin,
          password: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, data.email));

      const user = matchingUsers[0];
      if (!user) {
        return c.json(actionFailure("User not found"), 404);
      }

      const passwordMatch = await bcrypt.compare(data.password, user.password);
      if (!passwordMatch) {
        return c.json(actionFailure("Incorrect password"), 401);
      }

      // Create session
      await createSession(c, user);

      return c.json(actionSuccess());
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const signup = server.post(
  "/auth/signup",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // Create user
      const user = await createUser(data);

      // Create default team
      await createTeam(user.id, {
        name: "My Team",
      });

      // Create session
      await createSession(c, user);

      return c.json(actionSuccess());
    } catch (e) {
      console.error(e);

      if (e instanceof Error && e.message === "User already exists") {
        return c.json(actionFailure("User already exists"), 409);
      }

      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const logout = server.post("/auth/logout", async (c) => {
  try {
    await deleteSession(c);
    return c.json(actionSuccess());
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});

const me = server.get("/auth/me", requireAuth(), async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json(actionFailure("User not found"), 404);
    }
    const completedOnboardingSteps = await getCompletedOnboardingSteps(user.id);
    return c.json(actionSuccess({ data: {
      ...user,
      completedOnboardingSteps,
    } }));
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});

const teams = server.get("/auth/teams", requireAuth(), async (c) => {
  try {
    const teams = await getUserTeams(c.var.user.id);
    return c.json(actionSuccess({ data: teams }));
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});



export type Auth = typeof login | typeof signup | typeof logout | typeof me | typeof teams;

export default server; 
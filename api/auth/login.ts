import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createSession } from "lib/session";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { db } from "@recommand/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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
          password: users.password,
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

export type Login = typeof login;

export default server;

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createUser } from "data/users";
import { createSession } from "lib/session";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";

const server = new Server();

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
export type Signup = typeof signup;

export default server;

import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { createUser, getCurrentUser } from "@core/data/users";
import { createSession, deleteSession } from "@core/lib/session";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { db } from "@recommand/db";
import { users } from "@core/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createTeam, getUserTeams, updateTeam, deleteTeam } from "@core/data/teams";
import { requireAuth, requireTeamAccess } from "@core/lib/auth-middleware";
import { getCompletedOnboardingSteps } from "@core/data/onboarding";
import { sendEmail } from "@core/lib/email";
import { PasswordResetEmail } from "@core/emails/password-reset-email";
import { SignupEmailConfirmation } from "@core/emails/signup-confirmation";
import { randomBytes } from "crypto";
import { describeRoute } from "hono-openapi";

const server = new Server();

// Generate cryptographically secure random token
function generateSecureToken(): string {
  return randomBytes(32).toString("hex"); // 64 character hex string
}

const login = server.post(
  "/auth/login",
  zodValidator(
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
          emailVerified: users.emailVerified,
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

      // Check if email is verified
      if (!user.emailVerified) {
        return c.json(
          actionFailure("Please confirm your email address before logging in"),
          401
        );
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
  zodValidator(
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

      // Create user with email verification token
      const user = await createUser(data);

      // Generate email verification token
      const verificationToken = generateSecureToken();

      // Update user with verification token and expiration (24 hours from now)
      await db
        .update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationExpires: sql`CURRENT_TIMESTAMP + INTERVAL '24 hours'`,
        })
        .where(eq(users.id, user.id));

      // Send confirmation email
      const confirmationUrl = `${process.env.BASE_URL}/email-confirmation/${verificationToken}`;
      await sendEmail({
        to: data.email,
        subject: "Confirm your email address",
        email: SignupEmailConfirmation({
          firstName: "there", // Since we don't have firstName in the schema
          confirmationUrl,
        }),
      });

      return c.json(
        actionSuccess({
          message:
            "Account created successfully. Please check your email to confirm your account.",
        })
      );
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
    return c.json(
      actionSuccess({
        data: {
          ...user,
          completedOnboardingSteps,
        },
      })
    );
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});

const teams = server.get("/auth/teams", requireAuth(), async (c) => {
  try {
    const teams = await getUserTeams(c.get("user").id);
    return c.json(actionSuccess({ data: teams }));
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});

const createTeamEndpoint = server.post(
  "/auth/teams",
  requireAuth(),
  zodValidator(
    "json",
    z.object({
      name: z.string().min(1, { message: "Team name is required" }),
      teamDescription: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      const team = await createTeam(user.id, {
        name: data.name,
        teamDescription: data.teamDescription,
      });

      return c.json(actionSuccess({ data: team }));
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const requestPasswordReset = server.post(
  "/auth/request-password-reset",
  zodValidator(
    "json",
    z.object({
      email: z.string().email(),
    })
  ),
  async (c) => {
    try {
      const { email } = c.req.valid("json");

      // Find user
      const matchingUsers = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, email));

      const user = matchingUsers[0];
      if (!user) {
        // Don't reveal if user exists or not
        return c.json(actionSuccess());
      }

      // Generate reset token
      const resetToken = generateSecureToken();

      // Store reset token in database with expiration (1 hour from now)
      await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpires: sql`CURRENT_TIMESTAMP + INTERVAL '1 hour'`,
        })
        .where(eq(users.id, user.id));

      // Send reset email
      const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;
      await sendEmail({
        to: email,
        subject: "Reset your Recommand password",
        email: PasswordResetEmail({
          firstName: "there", // Since we don't have firstName in the schema
          resetPasswordLink: resetLink,
        }),
      });

      return c.json(actionSuccess());
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const confirmEmail = server.post(
  "/auth/confirm-email",
  zodValidator(
    "json",
    z.object({
      token: z.string(),
    })
  ),
  async (c) => {
    try {
      const { token } = c.req.valid("json");

      // Find user with valid email verification token
      const matchingUsers = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(
          sql`${users.emailVerificationToken} = ${token} AND ${users.emailVerificationExpires} > CURRENT_TIMESTAMP`
        );

      const user = matchingUsers[0];
      if (!user) {
        return c.json(
          actionFailure("Invalid or expired confirmation token"),
          400
        );
      }

      if (user.emailVerified) {
        return c.json(actionFailure("Email already verified"), 400);
      }

      // Mark email as verified and clear verification token
      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        })
        .where(eq(users.id, user.id));

      // Create default team after email verification
      await createTeam(user.id, {
        name: "My Team",
      });

      // Create session for the user
      await createSession(c, { id: user.id, isAdmin: false });

      return c.json(
        actionSuccess({
          message: "Email confirmed successfully. You are now logged in.",
        })
      );
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const resendConfirmationEmail = server.post(
  "/auth/resend-confirmation",
  zodValidator(
    "json",
    z.object({
      email: z.string().email(),
    })
  ),
  async (c) => {
    try {
      const { email } = c.req.valid("json");

      // Find user
      const matchingUsers = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.email, email));

      const user = matchingUsers[0];
      if (!user) {
        // Don't reveal if user exists or not
        return c.json(
          actionSuccess({
            message:
              "If an account with that email exists and is not verified, a confirmation email has been sent.",
          })
        );
      }

      if (user.emailVerified) {
        return c.json(actionFailure("Email is already verified"), 400);
      }

      // Generate new verification token
      const verificationToken = generateSecureToken();

      // Update user with new verification token and expiration (24 hours from now)
      await db
        .update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationExpires: sql`CURRENT_TIMESTAMP + INTERVAL '24 hours'`,
        })
        .where(eq(users.id, user.id));

      // Send confirmation email
      const confirmationUrl = `${process.env.BASE_URL}/email-confirmation/${verificationToken}`;
      await sendEmail({
        to: email,
        subject: "Confirm your email address",
        email: SignupEmailConfirmation({
          firstName: "there", // Since we don't have firstName in the schema
          confirmationUrl,
        }),
      });

      return c.json(
        actionSuccess({
          message:
            "If an account with that email exists and is not verified, a confirmation email has been sent.",
        })
      );
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const resetPassword = server.post(
  "/auth/reset-password",
  zodValidator(
    "json",
    z.object({
      token: z.string(),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
    })
  ),
  async (c) => {
    try {
      const { token, password } = c.req.valid("json");

      // Find user with valid reset token
      const matchingUsers = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(
          sql`${users.resetToken} = ${token} AND ${users.resetTokenExpires} > CURRENT_TIMESTAMP`
        );

      const user = matchingUsers[0];
      if (!user) {
        return c.json(actionFailure("Invalid or expired reset token"), 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password and clear reset token, also set emailVerified to true and clear emailVerificationToken and emailVerificationExpires
      await db
        .update(users)
        .set({
          passwordHash,
          resetToken: null,
          resetTokenExpires: null,
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        })
        .where(eq(users.id, user.id));

      return c.json(actionSuccess());
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const updateTeamEndpoint = server.put(
  "/auth/teams/:teamId",
  requireTeamAccess(),
  zodValidator(
    "json",
    z.object({
      name: z.string().min(1, { message: "Team name is required" }).optional(),
      teamDescription: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const team = c.get("team");

      const updatedTeam = await updateTeam(team.id, data);

      return c.json(actionSuccess({ data: updatedTeam }));
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const deleteTeamEndpoint = server.delete(
  "/auth/teams/:teamId",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    try {
      const team = c.get("team");
      
      await deleteTeam(team.id);
      
      return c.json(actionSuccess({ message: "Team deleted successfully" }));
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const verify = server.get(
  "/auth/verify",
  requireAuth(),
  describeRoute({
    operationId: "verifyAuth",
    description: "Verify if the user is authenticated",
    summary: "Verify Authentication",
    tags: ["Authentication"],
    responses: {
      200: {
        description: "User is authenticated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      401: {
        description: "User is not authenticated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                errors: {
                  type: "object",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                errors: {
                  type: "object",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  }),
  async (c) => {
    try {
      return c.json(actionSuccess());
    } catch (e) {
      console.error(e);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

export type Auth =
  | typeof login
  | typeof signup
  | typeof logout
  | typeof me
  | typeof teams
  | typeof createTeamEndpoint
  | typeof updateTeamEndpoint
  | typeof deleteTeamEndpoint
  | typeof requestPasswordReset
  | typeof resetPassword
  | typeof confirmEmail
  | typeof resendConfirmationEmail
  | typeof verify;

export default server;

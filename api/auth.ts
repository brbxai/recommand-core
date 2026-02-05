import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { checkBasicAuth, createUser, getCurrentUser, getUsers, type UserWithoutPassword } from "@core/data/users";
import { createSession, deleteSession } from "@core/lib/session";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { db } from "@recommand/db";
import { users, userPermissions } from "@core/db/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createTeam, getUserTeams, updateTeam, deleteTeam } from "@core/data/teams";
import { requireAdmin, requireAuth, requireTeamAccess } from "@core/lib/auth-middleware";
import { getCompletedOnboardingSteps } from "@core/data/onboarding";
import { sendEmail } from "@core/lib/email";
import { getEmailTemplate } from "@core/emails";
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

      // Check if user exists and password is correct
      const userInfo = await checkBasicAuth(data.email, data.password);
      if (!userInfo.passwordMatch) {
        return c.json(actionFailure("Incorrect password"), 401);
      }
      if (!userInfo.emailVerified) {
        return c.json(actionFailure("Please confirm your email address before logging in"), 401);
      }
      if (!userInfo.user) {
        return c.json(actionFailure("User not found"), 404);
      }

      const user = userInfo.user;

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
      const signupEmail = await getEmailTemplate("signup-confirmation");
      const emailProps = { firstName: "there", confirmationUrl };
      await sendEmail({
        to: data.email,
        subject: signupEmail.subject(emailProps),
        email: signupEmail.render(emailProps),
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

    // Fetch all permissions for all teams the user is a member of
    const teamIds = user.teams?.filter(t => t.isMember).map(t => t.id) ?? [];
    let teamPermissions: Record<string, string[]> = {};

    if (teamIds.length > 0) {
      const permissions = await db
        .select({
          teamId: userPermissions.teamId,
          permissionId: userPermissions.permissionId,
        })
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, user.id),
            inArray(userPermissions.teamId, teamIds),
          )
        );

      // Group permissions by team
      for (const perm of permissions) {
        if (!teamPermissions[perm.teamId]) {
          teamPermissions[perm.teamId] = [];
        }
        teamPermissions[perm.teamId].push(perm.permissionId);
      }
    }

    return c.json(
      actionSuccess({
        data: {
          ...user,
          completedOnboardingSteps,
          teamPermissions,
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
    const userId = c.get("user")?.id;
    if (!userId) {
      return c.json(actionFailure("Unauthorized"), 401);
    }
    const teams = await getUserTeams(userId);
    return c.json(actionSuccess({ data: teams }));
  } catch (e) {
    console.error(e);
    return c.json(actionFailure("Internal server error"), 500);
  }
});

const getUsersEndpoint = server.get("/auth/users", requireAdmin(), async (c) => {
  try {
    const usersWithoutPassword: UserWithoutPassword[] = await getUsers();
    return c.json(actionSuccess({ usersWithoutPassword }));
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
      if (!user?.id) {
        return c.json(actionFailure("Unauthorized"), 401);
      }
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
      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      const matchingUsers = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail));

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
      const passwordResetEmail = await getEmailTemplate("password-reset-email");
      const resetEmailProps = { firstName: "there", resetPasswordLink: resetLink };
      await sendEmail({
        to: normalizedEmail,
        subject: passwordResetEmail.subject(resetEmailProps),
        email: passwordResetEmail.render(resetEmailProps),
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
      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      const matchingUsers = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail));

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
      const signupEmail = await getEmailTemplate("signup-confirmation");
      const emailProps = { firstName: "there", confirmationUrl };
      await sendEmail({
        to: normalizedEmail,
        subject: signupEmail.subject(emailProps),
        email: signupEmail.render(emailProps),
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
  | typeof getUsersEndpoint
  | typeof createTeamEndpoint
  | typeof updateTeamEndpoint
  | typeof deleteTeamEndpoint
  | typeof requestPasswordReset
  | typeof resetPassword
  | typeof confirmEmail
  | typeof resendConfirmationEmail
  | typeof verify;

export default server;

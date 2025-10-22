import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { getMinimalTeamMembers, addTeamMember, removeTeamMember, getUserByEmail, isTeamMember } from "@core/data/team-members";
import { requireTeamAccess } from "@core/lib/auth-middleware";
import { createUserForInvitation } from "@core/data/users";
import { sendEmail } from "@core/lib/email";
import { TeamInvitationEmail } from "@core/emails/team-invitation-email";
import { randomBytes } from "crypto";
import { db } from "@recommand/db";
import { users } from "@core/db/schema";
import { eq, sql } from "drizzle-orm";

const server = new Server();

// Generate cryptographically secure random token
function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

const _getTeamMembers = server.get(
  "/auth/teams/:teamId/members",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
    })
  ),
  async (c) => {
    try {
      const members = await getMinimalTeamMembers(c.get("team").id);
      return c.json(
        actionSuccess({
          members,
        })
      );
    } catch (error) {
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _addTeamMember = server.post(
  "/auth/teams/:teamId/members",
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
      email: z.string().email(),
    })
  ),
  async (c) => {
    try {
      const reqJson = c.req.valid("json");
      const teamId = c.get("team").id;
      const team = c.get("team");

      let user: { id: string; email: string; emailVerified: boolean } | null = null;
      let isNewUser = false;

      user = await getUserByEmail(reqJson.email);
      if (!user) {
        // Create user for invitation
        user = await createUserForInvitation(reqJson.email);
        isNewUser = true;
      }

      // Check if user is already a team member
      const isAlreadyMember = await isTeamMember(teamId, user.id);
      if (isAlreadyMember) {
        return c.json(actionFailure("User is already a member of this team"), 400);
      }

      // Add user to team
      const result = await addTeamMember(teamId, user.id);

      // If this is a new user or existing unverified user, send invitation email
      if (isNewUser || !user.emailVerified) {
        // Generate reset token for setting password
        const resetToken = generateSecureToken();

        // Store reset token in database with expiration (7 days for invitations)
        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpires: sql`CURRENT_TIMESTAMP + INTERVAL '7 days'`,
          })
          .where(eq(users.id, user.id));

        // Send invitation email
        const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;
        await sendEmail({
          to: user.email,
          subject: `You've been invited to join ${team.name} on Recommand`,
          email: TeamInvitationEmail({
            firstName: "there",
            teamName: team.name,
            resetPasswordLink: resetLink,
          }),
        });
      }

      return c.json(actionSuccess({
        teamMember: result[0],
        message: isNewUser ? "Invitation sent successfully" : "User added to team"
      }));
    } catch (error) {
      console.error(error);
      return c.json(actionFailure("Internal server error"), 500);
    }
  }
);

const _removeTeamMember = server.delete(
  "/auth/teams/:teamId/members/:userId",
  requireTeamAccess(),
  zodValidator(
    "param",
    z.object({
      teamId: z.string(),
      userId: z.string(),
    })
  ),
  async (c) => {
    try {
      await removeTeamMember(c.get("team").id, c.req.param("userId"));
      return c.json(actionSuccess());
    } catch (error) {
      return c.json(actionFailure(error as Error), 500);
    }
  }
);

export type TeamMembers =
  | typeof _getTeamMembers
  | typeof _addTeamMember
  | typeof _removeTeamMember;

export default server;
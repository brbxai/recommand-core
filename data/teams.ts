import { teamMembers, teams } from "@core/db/schema";
import { emitBackendEvent, CORE_BACKEND_EVENTS } from "@core/lib/backend-events";
import { db } from "@recommand/db";
import { and, count, eq } from "drizzle-orm";

export type Team = typeof teams.$inferSelect;

export async function getUserTeams(userId: string) {
  const matchingTeams = await db
    .select()
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId));
  return matchingTeams.map((team) => team.teams);
}

export async function getTeam(teamId: string) {
  const team = await db.select().from(teams).where(eq(teams.id, teamId));
  return team[0];
}

export async function createTeam(
  userId: string,
  team: typeof teams.$inferInsert
) {
  return await db.transaction(async (tx) => {
    const [newTeam] = await tx.insert(teams).values(team).returning();
    await tx.insert(teamMembers).values({
      userId,
      teamId: newTeam.id,
    });
    await emitBackendEvent(CORE_BACKEND_EVENTS.TEAM_CREATED, {...newTeam, tx});
    await emitBackendEvent(CORE_BACKEND_EVENTS.TEAM_MEMBER_ADDED, { teamId: newTeam.id, userId, tx });
    return newTeam;
  });
}

export async function isMember(userId: string, teamId: string) {
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));
  return cnt > 0;
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<typeof teams.$inferInsert, 'name' | 'teamDescription'>>
) {
  const [updatedTeam] = await db
    .update(teams)
    .set(updates)
    .where(eq(teams.id, teamId))
    .returning();
  return updatedTeam;
}

export async function deleteTeam(teamId: string) {
  const deletedTeam = await db.delete(teams).where(eq(teams.id, teamId));
  await emitBackendEvent(CORE_BACKEND_EVENTS.TEAM_DELETED, { teamId });
  return deletedTeam;
}
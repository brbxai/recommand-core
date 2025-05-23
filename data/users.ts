import { db } from "@recommand/db";
import bcrypt from "bcrypt";
import { verifySession } from "../lib/session";
import { users } from "../db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import type { Context } from "@recommand/lib/api";
import { teamMembers, teams } from "@core/db/schema";

export type UserWithoutPassword = Omit<typeof users.$inferSelect, "password">;

export const getCurrentUser = async (c: Context) => {
  // Verify user's session
  const session = await verifySession(c);
  // Fetch user data
  if (!session?.userId) {
    return null;
  }
  const userId = session.userId;
  const { passwordHash: password, ...rest } = getTableColumns(users); // exclude "password" column
  
  const data = await db
    .select({
      ...rest,
      teams: teams,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.id, userId));

  if (data.length === 0) {
    return null;
  }

  // Transform the data to group teams under the user
  const user = data[0];
  const userTeams = data.map(row => row.teams).filter(Boolean);
  
  return {
    ...user,
    teams: userTeams,
  } as UserWithoutPassword & { teams: typeof teams.$inferSelect[] };
};

export const createUser = async (userInfo: {
  email: string;
  password: string;
}) => {
  // Check if user already exists
  const existingUsers = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, userInfo.email));
  if (existingUsers.length > 0) {
    throw new Error("User already exists");
  }

  // Create user
  const hashedPassword = await bcrypt.hash(userInfo.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: userInfo.email,
      passwordHash: hashedPassword,
    })
    .returning({ id: users.id, isAdmin: users.isAdmin });

  return user;
};

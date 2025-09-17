import { db } from "@recommand/db";
import bcrypt from "bcrypt";
import { verifySession } from "../lib/session";
import { users } from "../db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import type { Context } from "@recommand/lib/api";
import { teamMembers, teams } from "@core/db/schema";
import { randomBytes } from "crypto";

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

export const createUserForInvitation = async (email: string) => {
  // Check if user already exists
  const existingUsers = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email));
  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  // Create user with temporary password (they'll need to reset it)
  const tempPassword = randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: email,
      passwordHash: hashedPassword,
      emailVerified: false,
    })
    .returning();

  return user;
};

export const checkBasicAuth = async (username: string, password: string) => {
  const user = await db
    .select({
      id: users.id,
      isAdmin: users.isAdmin,
      password: users.passwordHash,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, username));

  if (user.length === 0) {
    return {
      user: null,
      passwordMatch: false,
      emailVerified: false,
    }
  }

  const passwordMatch = await bcrypt.compare(password, user[0].password);
  if (!passwordMatch) {
    return {
      user: null,
      passwordMatch: false,
      emailVerified: false,
    }
  }

  if (!user[0].emailVerified) {
    return {
      user: null,
      passwordMatch: true,
      emailVerified: false,
    }
  }

  return {
    user: user[0],
    passwordMatch: true,
    emailVerified: true,
  }
};
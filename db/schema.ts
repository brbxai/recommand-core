import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { sql } from "drizzle-orm";
import { autoUpdateTimestamp } from "@recommand/db/custom-types";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => "usr_" + ulid()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: autoUpdateTimestamp(),
});

export const teams = pgTable("teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => "team_" + ulid()),
  name: text("name").notNull(),
  teamDescription: text("team_description").notNull().default("Developer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: autoUpdateTimestamp(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id").references(() => teams.id),
    userId: text("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: autoUpdateTimestamp(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => "key_" + ulid()),
    name: text("name").notNull(),
    teamId: text("team_id")
      .references(() => teams.id)
      .notNull(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    secretHash: text("secret_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: autoUpdateTimestamp(),
  },
  (table) => [index("api_keys_secret_hash_idx").using("hash", table.secretHash)]
);

export const completedOnboardingSteps = pgTable(
  "completed_onboarding_steps",
  {
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    teamId: text("team_id").references(() => teams.id),
    stepId: text("step_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: autoUpdateTimestamp(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.teamId, table.stepId] }),
  ]
);

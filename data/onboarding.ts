import { db } from "@recommand/db";
import { completedOnboardingSteps, teamMembers } from "@core/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";

export type CompletedOnboardingStep =
  typeof completedOnboardingSteps.$inferSelect;

export const getCompletedOnboardingSteps = async (userId: string) => {
  const steps = await db
    .select({
      userId: completedOnboardingSteps.userId,
      teamId: completedOnboardingSteps.teamId,
      stepId: completedOnboardingSteps.stepId,
      createdAt: completedOnboardingSteps.createdAt,
      updatedAt: completedOnboardingSteps.updatedAt,
    })
    .from(completedOnboardingSteps)
    .leftJoin(
      teamMembers,
      eq(completedOnboardingSteps.teamId, teamMembers.teamId)
    )
    .where(
      or(
        eq(completedOnboardingSteps.userId, userId),
        eq(teamMembers.userId, userId)
      )
    );

  return steps;
};

export const completeOnboardingStep = async (
  userId: string,
  teamId: string | null,
  stepId: string
) => {
  // Start transaction
  const tx = await db.transaction(async (tx) => {
    const existingStep = await tx
      .select()
      .from(completedOnboardingSteps)
      .where(
        and(
          eq(completedOnboardingSteps.stepId, stepId),
          eq(completedOnboardingSteps.userId, userId),
          or(
            eq(completedOnboardingSteps.teamId, teamId ?? ""),
            isNull(completedOnboardingSteps.teamId)
          )
        )
      );
    if (existingStep.length > 0) {
      return existingStep[0];
    }

    return (
      await tx
        .insert(completedOnboardingSteps)
        .values({ userId, teamId, stepId })
        .returning()
    )[0];
  });

  return tx;
};

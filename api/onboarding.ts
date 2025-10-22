import { zodValidator } from "@recommand/lib/zod-validator";
import { z } from "zod";
import { actionFailure, actionSuccess } from "@recommand/lib/utils";
import { Server } from "@recommand/lib/api";
import { requireAuth } from "@core/lib/auth-middleware";
import { completeOnboardingStep } from "@core/data/onboarding";

const server = new Server();

const _completeOnboardingStep = server.post(
  "/onboarding/complete",
  requireAuth(),
  zodValidator(
    "json",
    z.object({
      stepId: z.string(),
      teamId: z.string().nullable(),
    })
  ),
  async (c) => {
    try {
      const { stepId, teamId } = c.req.valid("json");
      const completedStep = await completeOnboardingStep(c.var.user.id, teamId, stepId);
      return c.json(actionSuccess({
        completedStep,
      }));
    } catch (error) {
      return c.json(actionFailure(error as Error), 500);
    }
  }
);

export type Onboarding = typeof _completeOnboardingStep;

export default server;
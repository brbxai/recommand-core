CREATE TABLE "completed_onboarding_steps" (
	"user_id" text,
	"team_id" text,
	"step_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "completed_onboarding_steps_user_id_team_id_step_id_pk" PRIMARY KEY("user_id","team_id","step_id")
);
--> statement-breakpoint
ALTER TABLE "completed_onboarding_steps" ADD CONSTRAINT "completed_onboarding_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_onboarding_steps" ADD CONSTRAINT "completed_onboarding_steps_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
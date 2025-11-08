CREATE TYPE "public"."api_key_types" AS ENUM('basic', 'jwt');--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "completed_onboarding_steps" DROP CONSTRAINT "completed_onboarding_steps_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "type" "api_key_types" DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completed_onboarding_steps" ADD CONSTRAINT "completed_onboarding_steps_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
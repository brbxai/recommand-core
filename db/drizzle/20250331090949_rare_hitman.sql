ALTER TABLE "teams" ADD COLUMN "plan_id" text DEFAULT 'developer' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "plan_description" text DEFAULT 'Developer' NOT NULL;
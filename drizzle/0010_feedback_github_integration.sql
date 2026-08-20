ALTER TABLE "feedback_submissions" ADD COLUMN "github_repository" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_id" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_number" integer;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_url" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_state" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_state_reason" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_issue_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_sync_status" text DEFAULT 'unlinked' NOT NULL;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_sync_error" text;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "github_synced_at" timestamp;
--> statement-breakpoint
CREATE INDEX "feedback_submissions_github_issue_idx" ON "feedback_submissions" USING btree ("github_repository", "github_issue_number");

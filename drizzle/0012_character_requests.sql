CREATE TABLE "character_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"from_character_id" uuid NOT NULL,
	"to_character_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"revert_requested_by" text,
	"sender_state" text NOT NULL,
	"recipient_state" text NOT NULL,
	"sender_applied" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recipient_applied" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_requests" ADD CONSTRAINT "character_requests_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_requests" ADD CONSTRAINT "character_requests_from_character_id_characters_id_fk" FOREIGN KEY ("from_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_requests" ADD CONSTRAINT "character_requests_to_character_id_characters_id_fk" FOREIGN KEY ("to_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_requests" ADD CONSTRAINT "character_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_requests" ADD CONSTRAINT "character_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "character_requests_to_character_idx" ON "character_requests" USING btree ("to_character_id","status");
--> statement-breakpoint
CREATE INDEX "character_requests_from_character_idx" ON "character_requests" USING btree ("from_character_id","status");
--> statement-breakpoint
CREATE INDEX "character_requests_campaign_idx" ON "character_requests" USING btree ("campaign_id");

CREATE TABLE "web_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"csrf_nonce" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"id_token" text,
	"scope" text NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "web_sessions" ADD CONSTRAINT "web_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "web_sessions_session_id_unique_idx" ON "web_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "web_sessions_user_id_idx" ON "web_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "web_sessions_expires_at_idx" ON "web_sessions" USING btree ("expires_at");
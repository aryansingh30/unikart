CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"institution_code" text NOT NULL,
	"institutional_id" text NOT NULL,
	"designation" text DEFAULT 'STUDENT' NOT NULL,
	"role" text DEFAULT 'CUSTOMER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"password_hash" text NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_idx" ON "accounts" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_member_idx" ON "accounts" ("institution_code","institutional_id");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" ("account_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS "support_conversations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"conversation_code" varchar(64) NOT NULL UNIQUE,
	"user_id" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"user_role" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_conversations_user_idx" ON "support_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "support_conversations_status_idx" ON "support_conversations" ("status");
CREATE INDEX IF NOT EXISTS "support_conversations_category_idx" ON "support_conversations" ("category");
CREATE INDEX IF NOT EXISTS "support_conversations_code_idx" ON "support_conversations" ("conversation_code");

CREATE TABLE IF NOT EXISTS "support_messages" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"conversation_id" varchar(128) NOT NULL REFERENCES "support_conversations"("id") ON DELETE cascade,
	"sender_user_id" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"sender_role" varchar(50) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_messages_conv_idx" ON "support_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "support_messages_sender_idx" ON "support_messages" ("sender_user_id");
CREATE INDEX IF NOT EXISTS "support_messages_created_idx" ON "support_messages" ("created_at");

CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"clerk_user_id" varchar(128),
	"full_name" text NOT NULL,
	"national_id" varchar(14) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"university" varchar(150) NOT NULL,
	"avatar_url" text,
	"role" varchar(50) DEFAULT 'student' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

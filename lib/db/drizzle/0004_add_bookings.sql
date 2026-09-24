CREATE TABLE IF NOT EXISTS "bookings" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"booking_code" varchar(64) NOT NULL UNIQUE,
	"property_id" integer NOT NULL REFERENCES "apartments"("id") ON DELETE cascade,
	"student_id" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"payment_method" varchar(50) NOT NULL,
	"payment_amount" integer NOT NULL,
	"receipt_image_url" text,
	"sender_phone" varchar(50),
	"reference_number" varchar(100),
	"status" varchar(50) DEFAULT 'pending_review' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "bookings_student_idx" ON "bookings" ("student_id");
CREATE INDEX IF NOT EXISTS "bookings_property_idx" ON "bookings" ("property_id");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" ("status");
CREATE INDEX IF NOT EXISTS "bookings_code_idx" ON "bookings" ("booking_code");

CREATE TABLE IF NOT EXISTS "favorites" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"student_id" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"property_id" integer NOT NULL REFERENCES "apartments"("id") ON DELETE cascade,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorites_student_property_uniq_idx" ON "favorites" ("student_id", "property_id");
CREATE INDEX IF NOT EXISTS "favorites_student_idx" ON "favorites" ("student_id");
CREATE INDEX IF NOT EXISTS "favorites_property_idx" ON "favorites" ("property_id");

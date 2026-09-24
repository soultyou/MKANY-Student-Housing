CREATE TABLE "apartment_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apartment_id" integer NOT NULL,
	"url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"city" varchar(150) NOT NULL,
	"address" text NOT NULL,
	"university" varchar(150) NOT NULL,
	"room_type" varchar(100) NOT NULL,
	"area_sqm" integer NOT NULL,
	"bedrooms" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"floor" varchar(50) NOT NULL,
	"furnishing" varchar(100) NOT NULL,
	"available_from" varchar(100) NOT NULL,
	"current_roommates" integer NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_360_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"premium" boolean DEFAULT false NOT NULL,
	"livability_score" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'متاح' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"nearby_amenities" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apartment_photos" ADD CONSTRAINT "apartment_photos_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_apartment_idx" ON "apartment_photos" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "apartments_owner_idx" ON "apartments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "apartments_city_idx" ON "apartments" USING btree ("city");--> statement-breakpoint
CREATE INDEX "apartments_university_idx" ON "apartments" USING btree ("university");--> statement-breakpoint
CREATE INDEX "apartments_price_idx" ON "apartments" USING btree ("price");
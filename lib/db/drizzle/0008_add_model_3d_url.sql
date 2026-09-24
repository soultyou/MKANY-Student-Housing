ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "model_3d_url" text;
ALTER TABLE "inspections" ADD COLUMN IF NOT EXISTS "model_3d_url" text;

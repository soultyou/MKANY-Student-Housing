-- Migration 0007: Add super_admin role support
COMMENT ON COLUMN "users"."role" IS 'Role of the user: student, owner, admin, super_admin';

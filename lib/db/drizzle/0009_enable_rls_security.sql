-- Enable Row Level Security on public application tables
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;

-- Revoke PostgREST Data API access from anon and authenticated roles on public schema tables
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Drop insecure storage policies for private bucket if they exist
DROP POLICY IF EXISTS "Allow insert mkany-private-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow select mkany-private-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow update mkany-private-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete mkany-private-files" ON storage.objects;

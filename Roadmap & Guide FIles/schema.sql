-- schema.sql
-- Run this in Supabase SQL editor to create the db

-- 0. CLEANUP (Drop existing objects if you are re-running this script)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.record_news_view(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;

DROP TABLE IF EXISTS public.news_views CASCADE;
DROP TABLE IF EXISTS public.queries CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.buyer_profiles CASCADE;
DROP TABLE IF EXISTS public.reporter_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.platform_applications CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS news_status CASCADE;

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom Types
CREATE TYPE user_role AS ENUM ('buyer', 'reporter', 'both', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE news_status AS ENUM ('pending', 'published', 'sold', 'rejected', 'permanently_rejected');

-- 3. Users Table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'buyer',
    status user_status NOT NULL DEFAULT 'pending',
    profile_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Reporter Profiles Table
CREATE TABLE public.reporter_profiles (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    id_proof_url TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    agreement_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    generated_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4B. Buyer Profiles Table
CREATE TABLE public.buyer_profiles (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    company_registration_url TEXT,
    agreement_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Categories Table
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL
);

INSERT INTO public.categories (name, slug, status, sort_order)
VALUES
  ('Politics', 'politics', TRUE, 1),
  ('Business', 'business', TRUE, 2),
  ('Technology', 'technology', TRUE, 3),
  ('Sports', 'sports', TRUE, 4),
  ('Entertainment', 'entertainment', TRUE, 5),
  ('Health', 'health', TRUE, 6),
  ('World', 'world', TRUE, 7),
  ('Crime', 'crime', TRUE, 8);

-- 6. News Table
CREATE TABLE public.news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.users(id) NOT NULL,
    reporter_name TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    reporter_price NUMERIC(10, 2) NOT NULL,
    selling_price NUMERIC(10, 2),
    views_count INTEGER DEFAULT 0 NOT NULL,
    rejection_count INTEGER DEFAULT 0 NOT NULL,
    status news_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Transactions Table
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    news_id UUID REFERENCES public.news(id) NOT NULL,
    buyer_id UUID REFERENCES public.users(id) NOT NULL,
    reporter_amount NUMERIC(10, 2) NOT NULL,
    platform_margin NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payout_status TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    access_expiry_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 8. Queries Table
CREATE TABLE public.queries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) NOT NULL,
    related_news_id UUID REFERENCES public.news(id),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8B. Platform Applications Table (for tracking reporter/buyer applications both with and without auth)
CREATE TABLE public.platform_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buyer', 'reporter')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_applications ENABLE ROW LEVEL SECURITY;

-- Helper Function
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Secure lookup function for news purchases to prevent infinite RLS loops
CREATE OR REPLACE FUNCTION get_user_news_purchases(p_user_id UUID)
RETURNS SETOF UUID 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT news_id FROM public.transactions WHERE buyer_id = p_user_id;
$$;

-- Users Table Policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Trigger to insert user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, role, status, profile_completed)
  VALUES (
    new.id,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'admin'::public.user_role
      ELSE 'buyer'::public.user_role
    END,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'approved'::public.user_status
      ELSE 'pending'::public.user_status
    END,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN TRUE
      ELSE FALSE
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill public.users for existing auth accounts (useful after schema resets)
INSERT INTO public.users (id, role, status, profile_completed)
SELECT
  au.id,
  CASE
    WHEN lower(coalesce(au.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'admin'::user_role
    WHEN rp.user_id IS NOT NULL THEN 'reporter'::user_role
    ELSE 'buyer'::user_role
  END,
  CASE
    WHEN lower(coalesce(au.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'approved'::user_status
    WHEN rp.user_id IS NOT NULL THEN 'approved'::user_status
    ELSE 'pending'::user_status
  END,
  CASE
    WHEN lower(coalesce(au.email, '')) = lower('directoratulpatoliya@gmail.com') THEN TRUE
    WHEN rp.user_id IS NOT NULL THEN TRUE
    WHEN bp.user_id IS NOT NULL THEN TRUE
    ELSE FALSE
  END
FROM auth.users au
LEFT JOIN public.reporter_profiles rp ON rp.user_id = au.id
LEFT JOIN public.buyer_profiles bp ON bp.user_id = au.id
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

UPDATE public.users
SET role = 'admin'::user_role,
    status = 'approved'::user_status,
    profile_completed = TRUE
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE lower(coalesce(email, '')) = lower('directoratulpatoliya@gmail.com')
);

-- Update profile_completed where profiles exist
UPDATE public.users
SET profile_completed = TRUE
WHERE EXISTS (
  SELECT 1 FROM public.reporter_profiles
  WHERE reporter_profiles.user_id = users.id
) OR EXISTS (
  SELECT 1 FROM public.buyer_profiles
  WHERE buyer_profiles.user_id = users.id
);

-- Reporter Profiles Policies
DROP POLICY IF EXISTS "Reporters can read own profile" ON public.reporter_profiles;
CREATE POLICY "Reporters can read own profile" ON public.reporter_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Reporters can update own profile" ON public.reporter_profiles;
CREATE POLICY "Reporters can update own profile" ON public.reporter_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Reporters can insert own profile" ON public.reporter_profiles;
CREATE POLICY "Reporters can insert own profile" ON public.reporter_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.reporter_profiles;
CREATE POLICY "Admins can read all profiles" ON public.reporter_profiles FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Buyer Profiles Policies
DROP POLICY IF EXISTS "Buyers can read own profile" ON public.buyer_profiles;
CREATE POLICY "Buyers can read own profile" ON public.buyer_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Buyers can update own profile" ON public.buyer_profiles;
CREATE POLICY "Buyers can update own profile" ON public.buyer_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Buyers can insert own profile" ON public.buyer_profiles;
CREATE POLICY "Buyers can insert own profile" ON public.buyer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can read all buyer profiles" ON public.buyer_profiles;
CREATE POLICY "Admins can read all buyer profiles" ON public.buyer_profiles FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Categories Policies
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- News Policies
DROP POLICY IF EXISTS "Public can read published news" ON public.news;
CREATE POLICY "Public can read published news" ON public.news FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Reporters can read own news" ON public.news;
CREATE POLICY "Reporters can read own news" ON public.news FOR SELECT USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Reporters with profile can insert news" ON public.news;
CREATE POLICY "Reporters with profile can insert news" ON public.news FOR INSERT WITH CHECK (
  auth.uid() = reporter_id 
  AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND profile_completed = TRUE AND role IN ('reporter', 'both')
  )
);
DROP POLICY IF EXISTS "Reporters can update own news if not published" ON public.news;
CREATE POLICY "Reporters can update own news if not published" ON public.news FOR UPDATE 
  USING (auth.uid() = reporter_id AND status != 'published' AND status != 'sold');
DROP POLICY IF EXISTS "Admins have full access to news" ON public.news;
CREATE POLICY "Admins have full access to news" ON public.news USING (get_user_role(auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Buyers can read purchased news" ON public.news;
CREATE POLICY "Buyers can read purchased news" ON public.news FOR SELECT USING (
  id IN (SELECT get_user_news_purchases(auth.uid()))
);

-- Transactions Policies
DROP POLICY IF EXISTS "Buyers can view own transactions" ON public.transactions;
CREATE POLICY "Buyers can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Buyers can insert transactions" ON public.transactions;
CREATE POLICY "Buyers can insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Reporters can view own sales" ON public.transactions;
CREATE POLICY "Reporters can view own sales" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.news WHERE news.id = transactions.news_id AND news.reporter_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins full access transactions" ON public.transactions;
CREATE POLICY "Admins full access transactions" ON public.transactions USING (get_user_role(auth.uid()) = 'admin');

-- Queries Policies
DROP POLICY IF EXISTS "Users can view own queries" ON public.queries;
CREATE POLICY "Users can view own queries" ON public.queries FOR SELECT USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can insert queries" ON public.queries;
CREATE POLICY "Users can insert queries" ON public.queries FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Admins full access queries" ON public.queries;
CREATE POLICY "Admins full access queries" ON public.queries USING (get_user_role(auth.uid()) = 'admin');

-- Platform Applications Policies
DROP POLICY IF EXISTS "Users can read own application" ON public.platform_applications;
CREATE POLICY "Users can read own application" ON public.platform_applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert application" ON public.platform_applications;
CREATE POLICY "Users can insert application" ON public.platform_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own application if pending" ON public.platform_applications;
CREATE POLICY "Users can update own application if pending" ON public.platform_applications FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "Admins full access applications" ON public.platform_applications;
CREATE POLICY "Admins full access applications" ON public.platform_applications USING (get_user_role(auth.uid()) = 'admin');

-- 10. View Tracking System (Function)
CREATE TABLE public.news_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    news_id UUID REFERENCES public.news(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.news_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read views" ON public.news_views;
CREATE POLICY "Admins can read views" ON public.news_views FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION record_news_view(p_news_id UUID, p_ip_address TEXT)
RETURNS VOID AS $$
DECLARE
    v_recent_view BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.news_views
        WHERE news_id = p_news_id 
        AND ip_address = p_ip_address
        AND viewed_at > timezone('utc'::text, now()) - interval '5 minutes'
    ) INTO v_recent_view;

    IF NOT v_recent_view THEN
        INSERT INTO public.news_views (news_id, ip_address) VALUES (p_news_id, p_ip_address);
        UPDATE public.news SET views_count = views_count + 1 WHERE id = p_news_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage setup for 'news-media'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-media', 'news-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'news-media' );

DROP POLICY IF EXISTS "Users can insert media" ON storage.objects;
CREATE POLICY "Users can insert media"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'news-media' AND auth.uid() IS NOT NULL );

-- Platform Applications RLS Policies
ALTER TABLE public.platform_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert applications" ON public.platform_applications;
CREATE POLICY "Anyone can insert applications" ON public.platform_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read own application" ON public.platform_applications;
CREATE POLICY "Users can read own application" ON public.platform_applications FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
DROP POLICY IF EXISTS "Admins can view and update applications" ON public.platform_applications;
CREATE POLICY "Admins can view and update applications" ON public.platform_applications USING (get_user_role(auth.uid()) = 'admin');

-- 12. Existing Project Migration: Ordered Categories for News Settings
-- Run this block on an already-created project to support the master admin
-- category management screen with add/remove/reorder behavior.

DO $$
BEGIN
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'both';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, role, status, profile_completed)
  VALUES (
    new.id,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'admin'::public.user_role
      ELSE 'buyer'::public.user_role
    END,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'approved'::public.user_status
      ELSE 'pending'::public.user_status
    END,
    CASE
      WHEN lower(coalesce(new.email, '')) = lower('directoratulpatoliya@gmail.com') THEN TRUE
      ELSE FALSE
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.reporter_profiles
ADD COLUMN IF NOT EXISTS generated_password TEXT;

ALTER TABLE public.reporter_profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add missing columns to platform_applications if they don't exist (for existing projects)
ALTER TABLE public.platform_applications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.platform_applications
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.platform_applications
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Existing project backfill for public.users if rows are missing.
INSERT INTO public.users (id, role, status)
SELECT
  au.id,
  CASE
    WHEN lower(coalesce(au.email, '')) = lower('directoratulpatoliya@gmail.com') THEN 'admin'::user_role
    WHEN rp.user_id IS NOT NULL THEN 'reporter'::user_role
    ELSE 'buyer'::user_role
  END,
  'approved'::user_status
FROM auth.users au
LEFT JOIN public.reporter_profiles rp ON rp.user_id = au.id
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

UPDATE public.users u
SET role = 'reporter'::user_role
FROM public.reporter_profiles rp
WHERE rp.user_id = u.id
  AND u.role <> 'admin'::user_role;

UPDATE public.users
SET role = 'admin'::user_role,
    status = 'approved'::user_status
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE lower(coalesce(email, '')) = lower('directoratulpatoliya@gmail.com')
);

UPDATE public.users u
SET role = 'reporter'::user_role,
    status = 'approved'::user_status,
    profile_completed = TRUE
FROM auth.users au
JOIN public.platform_applications pa
  ON lower(coalesce(pa.email, '')) = lower(coalesce(au.email, ''))
WHERE u.id = au.id
  AND pa.type = 'reporter'
  AND pa.status = 'approved'
  AND u.role <> 'admin'::user_role;

WITH ordered_categories AS (
  SELECT id,
       ROW_NUMBER() OVER (
         ORDER BY
           CASE WHEN sort_order > 0 THEN sort_order ELSE 999999 END,
           name ASC
       ) AS new_sort_order
  FROM public.categories
)
UPDATE public.categories
SET sort_order = ordered_categories.new_sort_order
FROM ordered_categories
WHERE public.categories.id = ordered_categories.id;

INSERT INTO public.categories (name, slug, status, sort_order)
VALUES
  ('Politics', 'politics', TRUE, 1),
  ('Business', 'business', TRUE, 2),
  ('Technology', 'technology', TRUE, 3),
  ('Sports', 'sports', TRUE, 4),
  ('Entertainment', 'entertainment', TRUE, 5),
  ('Health', 'health', TRUE, 6),
  ('World', 'world', TRUE, 7),
  ('Crime', 'crime', TRUE, 8)
ON CONFLICT (slug) DO NOTHING;

WITH ordered_categories AS (
  SELECT id,
       ROW_NUMBER() OVER (ORDER BY sort_order ASC, name ASC) AS new_sort_order
  FROM public.categories
)
UPDATE public.categories
SET sort_order = ordered_categories.new_sort_order
FROM ordered_categories
WHERE public.categories.id = ordered_categories.id;

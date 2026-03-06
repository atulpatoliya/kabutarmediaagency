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
DROP TABLE IF EXISTS public.reporter_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS news_status CASCADE;

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom Types
CREATE TYPE user_role AS ENUM ('buyer', 'reporter', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE news_status AS ENUM ('pending', 'published', 'sold', 'rejected', 'permanently_rejected');

-- 3. Users Table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'buyer',
    status user_status NOT NULL DEFAULT 'pending',
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
    agreement_accepted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Categories Table
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. News Table
CREATE TABLE public.news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.users(id) NOT NULL,
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

-- 9. Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Helper Function
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Table Policies
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON public.users FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Trigger to insert user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, status)
  VALUES (new.id, 'buyer', 'approved');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Reporter Profiles Policies
CREATE POLICY "Reporters can read own profile" ON public.reporter_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Reporters can update own profile" ON public.reporter_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Reporters can insert own profile" ON public.reporter_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.reporter_profiles FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Categories Policies
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- News Policies
CREATE POLICY "Public can read published news" ON public.news FOR SELECT USING (status = 'published');
CREATE POLICY "Reporters can read own news" ON public.news FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Reporters can insert own news" ON public.news FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters can update own news if not published" ON public.news FOR UPDATE 
  USING (auth.uid() = reporter_id AND status != 'published' AND status != 'sold');
CREATE POLICY "Admins have full access to news" ON public.news USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Buyers can read purchased news" ON public.news FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.news_id = news.id AND transactions.buyer_id = auth.uid()
  )
);

-- Transactions Policies
CREATE POLICY "Buyers can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Reporters can view own sales" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.news WHERE news.id = transactions.news_id AND news.reporter_id = auth.uid())
);
CREATE POLICY "Admins full access transactions" ON public.transactions USING (get_user_role(auth.uid()) = 'admin');

-- Queries Policies
CREATE POLICY "Users can view own queries" ON public.queries FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can insert queries" ON public.queries FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins full access queries" ON public.queries USING (get_user_role(auth.uid()) = 'admin');

-- 10. View Tracking System (Function)
CREATE TABLE public.news_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    news_id UUID REFERENCES public.news(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.news_views ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'news-media' );

CREATE POLICY "Users can insert media"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'news-media' AND auth.uid() IS NOT NULL );

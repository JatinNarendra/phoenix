-- =====================================================
-- PHOENIX GAME DATABASE SCHEMA - SAFE DEPLOYMENT
-- This file uses IF NOT EXISTS and CREATE OR REPLACE statements
-- Safe to run multiple times in Supabase SQL Editor
-- 
-- ✅ SAFE DEPLOYMENT VERSION
-- Based on verified live database schema (2025-01-15)
-- Database: xmsyjijnribmnfundfto.supabase.co
-- Total Tables: 9
-- 
-- Features:
-- - CREATE TABLE IF NOT EXISTS for all tables
-- - CREATE INDEX IF NOT EXISTS for all indexes
-- - CREATE OR REPLACE for functions
-- - Conditional constraint and policy creation
-- - Safe to run multiple times without errors
-- =====================================================

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: telegram_users
-- =====================================================
CREATE TABLE IF NOT EXISTS telegram_users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    language_code TEXT,
    photo_url TEXT,
    is_bot BOOLEAN DEFAULT false,
    stage INTEGER DEFAULT 1,
    game_state JSONB NOT NULL DEFAULT '{}',
    last_login TIMESTAMPTZ,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    referred_by TEXT,
    pending_referral_claim BOOLEAN DEFAULT false,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    force_refresh BOOLEAN DEFAULT false,
    force_refresh_reason TEXT,
    force_refresh_time TIMESTAMPTZ
);

-- Indexes for telegram_users (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_telegram_users_referred_by ON telegram_users(referred_by);
CREATE INDEX IF NOT EXISTS idx_telegram_users_created_at ON telegram_users(created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_users_last_active ON telegram_users(last_active);

-- =====================================================
-- TABLE 2: customers
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    logo_url TEXT,
    slug TEXT UNIQUE NOT NULL,
    email TEXT,
    social_tasks JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    website_tasks JSONB DEFAULT '{"links": [], "clicks": 0, "enabled": false}',
    campaign_name TEXT,
    campaign_sparks INTEGER DEFAULT 0,
    campaign_spins INTEGER DEFAULT 0,
    campaign_completed_by TEXT[] DEFAULT '{}',
    campaign_details TEXT
);

-- Indexes for customers (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_customers_slug ON customers(slug);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);

-- =====================================================
-- TABLE 3: customer_social_links
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    link_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    type TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    rewards JSONB DEFAULT '{"coins": 0, "spins": 0}',
    task_requirements JSONB DEFAULT '{"verification_type": "AUTOMATIC", "required_duration_seconds": 0, "required_engagement_count": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    platform_data JSONB DEFAULT '{}',
    platform TEXT,
    platform_name TEXT,
    total_completions INTEGER DEFAULT 0,
    migrated_to_new_structure BOOLEAN DEFAULT false,
    completion_status JSONB DEFAULT '{"completed_at": null, "completed_by": [], "completed_count": 0, "total_completions": 0, "completed_users_count": 0}',
    clicks JSONB DEFAULT '[]',
    action TEXT
);

-- Indexes for customer_social_links (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_customer_social_links_customer_id ON customer_social_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_social_links_type ON customer_social_links(type);
CREATE INDEX IF NOT EXISTS idx_customer_social_links_enabled ON customer_social_links(enabled);

-- =====================================================
-- TABLE 4: daily_rewards
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    coins INTEGER NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL,
    streak_bonus NUMERIC DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    streak_started_at TIMESTAMPTZ,
    last_streak_broken_at TIMESTAMPTZ,
    reward_data JSONB DEFAULT '{}',
    UNIQUE(user_id, day)
);

-- Indexes for daily_rewards (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_collected_at ON daily_rewards(collected_at);

-- =====================================================
-- TABLE 5: payment_records
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    charge_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment_records (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON payment_records(created_at);

-- =====================================================
-- TABLE 6: auto_tap_rewards
-- =====================================================
CREATE TABLE IF NOT EXISTS auto_tap_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    timer_id TEXT NOT NULL,
    coins_earned BIGINT NOT NULL DEFAULT 0,
    collected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    collected_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE 7: user_referral_stats
-- =====================================================
CREATE TABLE IF NOT EXISTS user_referral_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    referrer_id UUID,
    total_referrals INTEGER DEFAULT 0,
    total_rewards JSONB DEFAULT '{"coins": 0, "spins": 0}',
    claimed_rewards JSONB DEFAULT '{"coins": 0, "spins": 0}',
    claimed_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 8: user_task_completions
-- =====================================================
CREATE TABLE IF NOT EXISTS user_task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR NOT NULL,
    task_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    platform VARCHAR NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status VARCHAR NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE 9: user_referrals
-- =====================================================
CREATE TABLE IF NOT EXISTS user_referrals (
    id SERIAL PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referee_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reward_amount INTEGER DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMPTZ,
    referee_reward_claimed BOOLEAN DEFAULT false,
    referee_reward_amount INTEGER DEFAULT 0,
    referee_reward_claimed_at TIMESTAMPTZ,
    UNIQUE(referrer_id, referee_id)
);

-- Indexes for user_referrals (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_id ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referee_id ON user_referrals(referee_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS (Safe conditional creation)
-- =====================================================

-- Function to safely add constraints
DO $$
BEGIN
    -- Add foreign key constraint for customer_social_links -> customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_social_links_customer_id_fkey'
        AND table_name = 'customer_social_links'
    ) THEN
        ALTER TABLE customer_social_links ADD CONSTRAINT customer_social_links_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key constraint for daily_rewards -> telegram_users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_rewards_user_id_fkey'
        AND table_name = 'daily_rewards'
    ) THEN
        ALTER TABLE daily_rewards ADD CONSTRAINT daily_rewards_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES telegram_users(user_id);
    END IF;

    -- Add foreign key constraint for telegram_users self-reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'telegram_users_referred_by_fkey'
        AND table_name = 'telegram_users'
    ) THEN
        ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_referred_by_fkey 
            FOREIGN KEY (referred_by) REFERENCES telegram_users(user_id);
    END IF;

    -- Add foreign key constraint for user_referrals -> telegram_users (referee)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_referrals_referee_id_fkey'
        AND table_name = 'user_referrals'
    ) THEN
        ALTER TABLE user_referrals ADD CONSTRAINT user_referrals_referee_id_fkey 
            FOREIGN KEY (referee_id) REFERENCES telegram_users(user_id);
    END IF;

    -- Add foreign key constraint for user_referrals -> telegram_users (referrer)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_referrals_referrer_id_fkey'
        AND table_name = 'user_referrals'
    ) THEN
        ALTER TABLE user_referrals ADD CONSTRAINT user_referrals_referrer_id_fkey 
            FOREIGN KEY (referrer_id) REFERENCES telegram_users(user_id);
    END IF;

    -- Add foreign key constraint for user_task_completions -> customer_social_links (with CASCADE DELETE)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_task_completions_task_id_fkey'
        AND table_name = 'user_task_completions'
    ) THEN
        ALTER TABLE user_task_completions ADD CONSTRAINT user_task_completions_task_id_fkey 
            FOREIGN KEY (task_id) REFERENCES customer_social_links(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_tap_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_completions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (Safe conditional creation)
-- =====================================================

-- Function to safely create RLS policies
DO $$
BEGIN
    -- RLS Policies for telegram_users (disabled for service role access)
    -- Since we're using service role authentication through API routes,
    -- we disable RLS for this table for easier management
    ALTER TABLE telegram_users DISABLE ROW LEVEL SECURITY;

    -- RLS Policies for customers (with service role access)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Anyone can view customers') THEN
        CREATE POLICY "Anyone can view customers" ON customers
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Service role can manage customers') THEN
        CREATE POLICY "Service role can manage customers" ON customers
            FOR ALL USING (true);
    END IF;

    -- RLS Policies for customer_social_links (public read access + service role management)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_social_links' AND policyname = 'Anyone can view social links') THEN
        CREATE POLICY "Anyone can view social links" ON customer_social_links
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_social_links' AND policyname = 'Service role can manage social links') THEN
        CREATE POLICY "Service role can manage social links" ON customer_social_links
            FOR ALL USING (true);
    END IF;

    -- RLS Policies for daily_rewards
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can view their own rewards') THEN
        CREATE POLICY "Users can view their own rewards" ON daily_rewards
            FOR SELECT USING (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can insert their own rewards') THEN
        CREATE POLICY "Users can insert their own rewards" ON daily_rewards
            FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    END IF;

    -- RLS Policies for payment_records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_records' AND policyname = 'Users can view their own payments') THEN
        CREATE POLICY "Users can view their own payments" ON payment_records
            FOR SELECT USING (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_records' AND policyname = 'Users can insert their own payments') THEN
        CREATE POLICY "Users can insert their own payments" ON payment_records
            FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    END IF;

    -- RLS Policies for user_referrals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_referrals' AND policyname = 'Users can view their own referrals') THEN
        CREATE POLICY "Users can view their own referrals" ON user_referrals
            FOR SELECT USING (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_referrals' AND policyname = 'Users can insert their own referrals') THEN
        CREATE POLICY "Users can insert their own referrals" ON user_referrals
            FOR INSERT WITH CHECK (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);
    END IF;

    -- RLS Policies for auto_tap_rewards
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_tap_rewards' AND policyname = 'Users can view their own auto tap rewards') THEN
        CREATE POLICY "Users can view their own auto tap rewards" ON auto_tap_rewards
            FOR SELECT USING (auth.uid()::uuid = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_tap_rewards' AND policyname = 'Users can insert their own auto tap rewards') THEN
        CREATE POLICY "Users can insert their own auto tap rewards" ON auto_tap_rewards
            FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_tap_rewards' AND policyname = 'Users can update their own auto tap rewards') THEN
        CREATE POLICY "Users can update their own auto tap rewards" ON auto_tap_rewards
            FOR UPDATE USING (auth.uid()::uuid = user_id);
    END IF;

    -- RLS Policies for user_referral_stats
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_referral_stats' AND policyname = 'Users can view their own referral stats') THEN
        CREATE POLICY "Users can view their own referral stats" ON user_referral_stats
            FOR SELECT USING (auth.uid()::uuid = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_referral_stats' AND policyname = 'Users can insert their own referral stats') THEN
        CREATE POLICY "Users can insert their own referral stats" ON user_referral_stats
            FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_referral_stats' AND policyname = 'Users can update their own referral stats') THEN
        CREATE POLICY "Users can update their own referral stats" ON user_referral_stats
            FOR UPDATE USING (auth.uid()::uuid = user_id);
    END IF;

    -- RLS Policies for user_task_completions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_task_completions' AND policyname = 'Users can view their own task completions') THEN
        CREATE POLICY "Users can view their own task completions" ON user_task_completions
            FOR SELECT USING (auth.uid()::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_task_completions' AND policyname = 'Users can insert their own task completions') THEN
        CREATE POLICY "Users can insert their own task completions" ON user_task_completions
            FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    END IF;
END $$;

-- =====================================================
-- FUNCTIONS AND TRIGGERS (Safe to run multiple times)
-- =====================================================

-- Function to update updated_at timestamp (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to safely create triggers
DO $$
BEGIN
    -- Trigger for telegram_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_telegram_users_updated_at') THEN
        CREATE TRIGGER update_telegram_users_updated_at BEFORE UPDATE ON telegram_users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger for customers
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_customers_updated_at') THEN
        CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger for customer_social_links
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_customer_social_links_updated_at') THEN
        CREATE TRIGGER update_customer_social_links_updated_at BEFORE UPDATE ON customer_social_links
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger for payment_records
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_payment_records_updated_at') THEN
        CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger for user_referral_stats
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_referral_stats_updated_at') THEN
        CREATE TRIGGER update_user_referral_stats_updated_at BEFORE UPDATE ON user_referral_stats
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger for user_task_completions
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_task_completions_updated_at') THEN
        CREATE TRIGGER update_user_task_completions_updated_at BEFORE UPDATE ON user_task_completions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- OPTIONAL: SAMPLE DATA (Commented out by default)
-- =====================================================

/*
-- Uncomment to insert sample data (only if tables are empty)

-- Insert sample customer (from live database)
INSERT INTO customers (id, customer_name, logo_url, slug, email, social_tasks, website_tasks, campaign_name, campaign_sparks, campaign_spins, campaign_completed_by, campaign_details) 
SELECT '49348629-a3aa-4585-8d78-d40456373f76', 'Sparky', 'https://sfrsjfueqdkfjtlsflgz.supabase.co/storage/v1/object/public/sparky/customer-logos/4263d985-1960-4fe2-9813-3628b5411187.jpg', 'sparky', null, '{}', '{"links": [], "clicks": 0, "enabled": false}', 'Sparky Special', 1000000, 10, '[]', null
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE slug = 'sparky');

-- Insert sample social link (from live database)
INSERT INTO customer_social_links (id, customer_id, customer_name, link_url, is_primary, enabled, type, display_order, rewards, task_requirements, platform_data, platform, platform_name, total_completions, migrated_to_new_structure, completion_status, clicks, action) 
SELECT '7242228f-c53e-4c88-8abe-f6a003344119', '71550e28-82c2-4262-8573-0a6a6f8d3022', 'Ethena', 'https://x.com/ethena_labs', false, true, 'X', 0, '{"coins": 500000, "spins": 5}', '{"verification_type": "AUTOMATIC", "required_duration_seconds": 0, "required_engagement_count": 0}', '{}', 'X', null, 0, false, '{"completed_at": null, "completed_by": [], "completed_count": 0, "total_completions": 0, "completed_users_count": 0}', '["557493950", "6456097705", "6042897820", "123456789"]', null
WHERE NOT EXISTS (SELECT 1 FROM customer_social_links WHERE id = '7242228f-c53e-4c88-8abe-f6a003344119');
*/

-- =====================================================
-- VERIFICATION QUERIES (Optional - for checking setup)
-- =====================================================

/*
-- Uncomment to run verification queries after deployment

-- Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('telegram_users', 'customers', 'customer_social_links', 'daily_rewards', 'payment_records', 'user_referrals', 'auto_tap_rewards', 'user_referral_stats', 'user_task_completions')
ORDER BY table_name, ordinal_position;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('telegram_users', 'customers', 'customer_social_links', 'daily_rewards', 'payment_records', 'user_referrals', 'auto_tap_rewards', 'user_referral_stats', 'user_task_completions')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('telegram_users', 'customers', 'customer_social_links', 'daily_rewards', 'payment_records', 'user_referrals', 'auto_tap_rewards', 'user_referral_stats', 'user_task_completions')
ORDER BY tablename, policyname;

-- Check foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
*/

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- Success message
SELECT 'Phoenix Game Database Schema deployed successfully! All tables, indexes, constraints, RLS policies, functions, and triggers have been created.' AS deployment_status;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. This file is safe to run multiple times in Supabase SQL Editor
-- 2. All objects use IF NOT EXISTS or CREATE OR REPLACE for safe deployment
-- 3. Uncomment sample data section if you want to insert test data
-- 4. Uncomment verification queries section to check the deployment
-- 5. The schema includes all 9 tables with proper relationships and security
-- =====================================================
-- COMPLETE PHOENIX GAME DATABASE SCHEMA
-- This file contains the exact schema for all tables
-- Use this to recreate the database structure precisely
-- 
-- ✅ VERIFIED AGAINST LIVE DATABASE (2025-01-15)
-- Database: xmsyjijnribmnfundfto.supabase.co
-- Total Tables: 9
-- Total Records: 37 (in original 6 tables)
-- 
-- Tables Verified (Updated from Live Schema):
-- - telegram_users (11 records, 19 columns) - NULL: last_name, force_refresh_reason, force_refresh_time
-- - customers (5 records, 14 columns) - NULL: email, campaign_details (TEXT not JSONB)
-- - customer_social_links (12 records, 20 columns) - NULL: platform_name, action
-- - daily_rewards (5 records, 11 columns) - NULL: streak_started_at, last_streak_broken_at
-- - payment_records (3 records, 10 columns) - No NULL columns in sample data
-- - user_referrals (1 record, 10 columns) - No NULL columns in sample data
-- - auto_tap_rewards (0 records, 7 columns) - NEW TABLE
-- - user_referral_stats (0 records, 8 columns) - NEW TABLE  
-- - user_task_completions (0 records, 9 columns) - NEW TABLE
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: telegram_users
-- =====================================================
CREATE TABLE telegram_users (
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

-- Indexes for telegram_users
CREATE INDEX idx_telegram_users_referred_by ON telegram_users(referred_by);
CREATE INDEX idx_telegram_users_created_at ON telegram_users(created_at);
CREATE INDEX idx_telegram_users_last_active ON telegram_users(last_active);

-- =====================================================
-- TABLE 2: customers
-- =====================================================
CREATE TABLE customers (
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

-- Indexes for customers
CREATE INDEX idx_customers_slug ON customers(slug);
CREATE INDEX idx_customers_customer_name ON customers(customer_name);

-- =====================================================
-- TABLE 3: customer_social_links
-- =====================================================
CREATE TABLE customer_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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

-- Indexes for customer_social_links
CREATE INDEX idx_customer_social_links_customer_id ON customer_social_links(customer_id);
CREATE INDEX idx_customer_social_links_type ON customer_social_links(type);
CREATE INDEX idx_customer_social_links_enabled ON customer_social_links(enabled);

-- =====================================================
-- TABLE 4: daily_rewards
-- =====================================================
CREATE TABLE daily_rewards (
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

-- Indexes for daily_rewards
CREATE INDEX idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX idx_daily_rewards_collected_at ON daily_rewards(collected_at);

-- =====================================================
-- TABLE 5: payment_records
-- =====================================================
CREATE TABLE payment_records (
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

-- Indexes for payment_records
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_created_at ON payment_records(created_at);

-- =====================================================
-- TABLE 6: auto_tap_rewards
-- =====================================================
CREATE TABLE auto_tap_rewards (
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
CREATE TABLE user_referral_stats (
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
CREATE TABLE user_task_completions (
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
CREATE TABLE user_referrals (
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

-- Indexes for user_referrals
CREATE INDEX idx_user_referrals_referrer_id ON user_referrals(referrer_id);
CREATE INDEX idx_user_referrals_referee_id ON user_referrals(referee_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints
ALTER TABLE customer_social_links ADD CONSTRAINT customer_social_links_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE daily_rewards ADD CONSTRAINT daily_rewards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES telegram_users(user_id);

ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_referred_by_fkey 
    FOREIGN KEY (referred_by) REFERENCES telegram_users(user_id);

ALTER TABLE user_referrals ADD CONSTRAINT user_referrals_referee_id_fkey 
    FOREIGN KEY (referee_id) REFERENCES telegram_users(user_id);

ALTER TABLE user_referrals ADD CONSTRAINT user_referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES telegram_users(user_id);

ALTER TABLE user_task_completions ADD CONSTRAINT user_task_completions_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES customer_social_links(id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_tap_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telegram_users
CREATE POLICY "Users can view their own data" ON telegram_users
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own data" ON telegram_users
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own data" ON telegram_users
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- RLS Policies for customers (public read access)
CREATE POLICY "Anyone can view customers" ON customers
    FOR SELECT USING (true);

-- RLS Policies for customer_social_links (public read access)
CREATE POLICY "Anyone can view social links" ON customer_social_links
    FOR SELECT USING (true);

-- RLS Policies for daily_rewards
CREATE POLICY "Users can view their own rewards" ON daily_rewards
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own rewards" ON daily_rewards
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- RLS Policies for payment_records
CREATE POLICY "Users can view their own payments" ON payment_records
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own payments" ON payment_records
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- RLS Policies for user_referrals
CREATE POLICY "Users can view their own referrals" ON user_referrals
    FOR SELECT USING (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);

CREATE POLICY "Users can insert their own referrals" ON user_referrals
    FOR INSERT WITH CHECK (auth.uid()::text = referrer_id OR auth.uid()::text = referee_id);

-- RLS Policies for auto_tap_rewards
CREATE POLICY "Users can view their own auto tap rewards" ON auto_tap_rewards
    FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert their own auto tap rewards" ON auto_tap_rewards
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own auto tap rewards" ON auto_tap_rewards
    FOR UPDATE USING (auth.uid()::uuid = user_id);

-- RLS Policies for user_referral_stats
CREATE POLICY "Users can view their own referral stats" ON user_referral_stats
    FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert their own referral stats" ON user_referral_stats
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own referral stats" ON user_referral_stats
    FOR UPDATE USING (auth.uid()::uuid = user_id);

-- RLS Policies for user_task_completions
CREATE POLICY "Users can view their own task completions" ON user_task_completions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own task completions" ON user_task_completions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_telegram_users_updated_at BEFORE UPDATE ON telegram_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_social_links_updated_at BEFORE UPDATE ON customer_social_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_referral_stats_updated_at BEFORE UPDATE ON user_referral_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_task_completions_updated_at BEFORE UPDATE ON user_task_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATABASE STATISTICS (From Live Database)
-- =====================================================

-- Current record counts from live database:
-- telegram_users: 11 records
-- customers: 5 records  
-- customer_social_links: 12 records
-- daily_rewards: 5 records
-- payment_records: 3 records
-- user_referrals: 1 record
-- Total: 37 records

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample customer (from live database)
INSERT INTO customers (id, customer_name, logo_url, slug, email, social_tasks, website_tasks, campaign_name, campaign_sparks, campaign_spins, campaign_completed_by, campaign_details) VALUES
('49348629-a3aa-4585-8d78-d40456373f76', 'Sparky', 'https://sfrsjfueqdkfjtlsflgz.supabase.co/storage/v1/object/public/sparky/customer-logos/4263d985-1960-4fe2-9813-3628b5411187.jpg', 'sparky', null, '{}', '{"links": [], "clicks": 0, "enabled": false}', 'Sparky Special', 1000000, 10, '[]', null);

-- Insert sample social link (from live database)
INSERT INTO customer_social_links (id, customer_id, customer_name, link_url, is_primary, enabled, type, display_order, rewards, task_requirements, platform_data, platform, platform_name, total_completions, migrated_to_new_structure, completion_status, clicks, action) VALUES
('7242228f-c53e-4c88-8abe-f6a003344119', '71550e28-82c2-4262-8573-0a6a6f8d3022', 'Ethena', 'https://x.com/ethena_labs', false, true, 'X', 0, '{"coins": 500000, "spins": 5}', '{"verification_type": "AUTOMATIC", "required_duration_seconds": 0, "required_engagement_count": 0}', '{}', 'X', null, 0, false, '{"completed_at": null, "completed_by": [], "completed_count": 0, "total_completions": 0, "completed_users_count": 0}', '["557493950", "6456097705", "6042897820", "123456789"]', null);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

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

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. To create a new database instance:
--    - Run this entire SQL file in Supabase SQL Editor
--    - Or use: node supabase/backups/setup_new_instance.js

-- 2. To restore data from backup:
--    - Run: node supabase/backups/restore_data.js

-- 3. To create a new backup:
--    - Run: node supabase/backups/api_backup.js

-- 4. To view backup data:
--    - Run: node supabase/backups/view_data.js

-- 5. For complete setup instructions:
--    - See: supabase/backups/README.md

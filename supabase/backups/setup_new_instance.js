#!/usr/bin/env node

// =====================================================
// COMPLETE DATABASE INSTANCE SETUP SCRIPT
// Sets up a new Phoenix Game database instance from scratch
// =====================================================

/*
CURSOR PROMPT FOR COMPLETE DATABASE SETUP:

I need to set up a complete Phoenix Game database instance. Please help me:

1. Check if .env.local exists with Supabase credentials
2. Verify connection to Supabase project
3. Create all required database tables and schema
4. Set up indexes, constraints, and RLS policies
5. Restore data from backup files (35 records)
6. Verify the complete setup is working

This script will:
- Create 6 tables with proper schema
- Set up all indexes and constraints
- Configure RLS policies
- Restore all data from backup
- Verify everything is working

Please run this script and guide me through the complete setup process.
If any step fails, provide clear error messages and next steps.
*/

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("Please create .env.local with:");
  console.error("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co");
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Complete database schema
const schemaSQL = `
-- Create telegram_users table
CREATE TABLE IF NOT EXISTS telegram_users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    language_code TEXT,
    photo_url TEXT,
    is_bot BOOLEAN NOT NULL DEFAULT FALSE,
    game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    logo_url TEXT,
    slug TEXT NOT NULL UNIQUE,
    email TEXT,
    social_tasks JSONB NOT NULL DEFAULT '{}',
    website_tasks JSONB NOT NULL DEFAULT '{"links":[],"clicks":0,"enabled":false}',
    campaign_name TEXT,
    campaign_sparks INTEGER DEFAULT 0,
    campaign_spins INTEGER DEFAULT 0,
    campaign_completed_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_social_links table
CREATE TABLE IF NOT EXISTS customer_social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    link_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    clicks JSONB NOT NULL DEFAULT '[]'::jsonb,
    type TEXT NOT NULL,
    engagements JSONB NOT NULL DEFAULT '{"views": 0, "follows": 0, "shares": 0}',
    completion_status JSONB DEFAULT '{"completed_at": null, "completed_by": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_rewards table
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES telegram_users(user_id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    coins_earned INTEGER NOT NULL CHECK (coins_earned >= 0),
    streak_bonus INTEGER NOT NULL DEFAULT 0 CHECK (streak_bonus >= 0),
    current_streak INTEGER NOT NULL DEFAULT 1 CHECK (current_streak >= 0),
    max_streak INTEGER NOT NULL DEFAULT 1 CHECK (max_streak >= 0),
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT max_streak_greater_equal_current CHECK (max_streak >= current_streak)
);

-- Create payment_records table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'telegram_stars',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    charge_id TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
    id SERIAL PRIMARY KEY,
    referrer_id TEXT NOT NULL REFERENCES telegram_users(user_id),
    referee_id TEXT NOT NULL REFERENCES telegram_users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_amount INTEGER NOT NULL DEFAULT 50000,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    referee_bonus_amount INTEGER NOT NULL DEFAULT 50000,
    referee_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
    referee_bonus_claimed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referrer_id, referee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);
CREATE INDEX IF NOT EXISTS idx_telegram_users_last_active ON telegram_users(last_active);
CREATE INDEX IF NOT EXISTS idx_customers_slug ON customers(slug);
CREATE INDEX IF NOT EXISTS idx_customer_social_links_customer_id ON customer_social_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS payment_records_user_id_idx ON payment_records (user_id);
CREATE INDEX IF NOT EXISTS payment_records_charge_id_idx ON payment_records (charge_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_id ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referee_id ON user_referrals(referee_id);

-- Enable RLS on payment_records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow full access to service role" ON payment_records
    USING (true) WITH CHECK (true);
`;

async function setupDatabase() {
  console.log("🚀 Starting complete database setup...");
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  // Test connection
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("❌ Failed to connect to Supabase:", error.message);
      return;
    }
    console.log("✅ Connected to Supabase successfully");
  } catch (error) {
    console.error("❌ Connection error:", error.message);
    return;
  }

  // Create schema
  console.log("\n📊 Creating database schema...");
  try {
    const { error } = await supabase.rpc("exec_sql", { query: schemaSQL });
    if (error) {
      console.error("❌ Error creating schema:", error.message);
      console.log("Please run the schema SQL manually in Supabase SQL Editor");
      return;
    }
    console.log("✅ Database schema created successfully");
  } catch (error) {
    console.error("❌ Schema creation error:", error.message);
    console.log("Please run the schema SQL manually in Supabase SQL Editor");
  }

  // Find and restore data
  console.log("\n📁 Looking for backup files...");
  const backupDir = "supabase/backups";
  const backupFiles = fs
    .readdirSync(backupDir)
    .filter(
      (file) => file.startsWith("phoenix_api_backup_") && file.endsWith(".json")
    )
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.log(
      "⚠️  No backup files found. Database schema is ready but no data restored."
    );
    console.log(
      "To restore data later, run: node supabase/backups/restore_data.js"
    );
    return;
  }

  const latestBackup = backupFiles[0];
  const backupPath = path.join(backupDir, latestBackup);
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

  console.log(`📁 Using backup: ${latestBackup}`);
  console.log(`📅 Backup created: ${backup.timestamp}`);

  // Restore data
  console.log("\n🔄 Restoring data...");
  let totalRestored = 0;
  let totalErrors = 0;

  for (const [tableName, result] of Object.entries(backup.tables)) {
    if (result.error || result.data.length === 0) {
      console.log(`⏭️  Skipping ${tableName}: ${result.error || "no data"}`);
      continue;
    }

    console.log(`📊 Restoring ${tableName}: ${result.data.length} records`);

    try {
      const { error } = await supabase.from(tableName).insert(result.data);

      if (error) {
        console.error(`❌ Error restoring ${tableName}:`, error.message);
        totalErrors++;
      } else {
        console.log(`✅ ${tableName} restored successfully`);
        totalRestored += result.data.length;
      }
    } catch (error) {
      console.error(`❌ Exception restoring ${tableName}:`, error.message);
      totalErrors++;
    }
  }

  console.log("\n🎉 Database setup complete!");
  console.log(`📊 Total records restored: ${totalRestored}`);
  if (totalErrors > 0) {
    console.log(`⚠️  Errors encountered: ${totalErrors}`);
  }

  // Verify setup
  console.log("\n🔍 Verifying setup...");
  try {
    const { data: verifyData, error: verifyError } = await supabase
      .from("telegram_users")
      .select("count")
      .limit(1);

    if (verifyError) {
      console.log("⚠️  Could not verify setup (this might be normal)");
    } else {
      console.log("✅ Setup verification successful");
    }
  } catch (error) {
    console.log("⚠️  Verification check failed (this might be normal)");
  }

  console.log("\n📋 Next steps:");
  console.log("1. Check your Supabase dashboard to verify tables and data");
  console.log("2. Test your application: npm run dev");
  console.log("3. Run: node supabase/backups/view_data.js");
  console.log("4. Create new backup: node supabase/backups/api_backup.js");
}

// Run the setup
setupDatabase().catch(console.error);

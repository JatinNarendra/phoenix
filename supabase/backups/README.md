# 📁 Database Backups

This directory contains essential backup scripts for the Phoenix Game database.

<!--
CURSOR PROMPT FOR NEW DATABASE INSTANCE SETUP:

I need to set up a complete database instance for a Phoenix Game application. Please help me:

1. Create a new Supabase project or use an existing one
2. Set up the complete database schema with all required tables
3. Configure environment variables
4. Restore data from backup files
5. Verify the setup is working correctly

The application uses these tables:
- telegram_users (user data and game state)
- customers (customer information)
- customer_social_links (social media links with click tracking)
- daily_rewards (daily reward system)
- payment_records (payment transactions)
- user_referrals (referral system)

I have backup files in supabase/backups/ directory with all the data.

Please guide me through the complete setup process step by step, including:
- Creating/accessing Supabase project
- Setting up database schema
- Configuring environment variables
- Restoring data from backups
- Testing the setup

Make sure to provide exact SQL commands, environment variable examples, and verification steps.
-->

## 📂 Directory Structure

```
supabase/
├── backups/                   # Database backup scripts
│   ├── api_backup.js          # Create complete data backup
│   ├── view_data.js           # View backup contents
│   ├── backup_commands.md     # Backup instructions
│   ├── phoenix_api_backup_*.json  # Your data backups
│   └── README.md              # This file
└── config.toml                # Supabase configuration
```

## 🚀 Quick Start

### Create Complete Backup

```bash
# Get ALL your data (35 records)
node supabase/backups/api_backup.js
```

### View Backup Data

```bash
# See what's in your backup
node supabase/backups/view_data.js
```

## 📊 What's Backed Up

- ✅ **telegram_users**: 10 records
- ✅ **customers**: 5 records
- ✅ **customer_social_links**: 12 records
- ✅ **daily_rewards**: 5 records
- ✅ **payment_records**: 1 record
- ✅ **user_referrals**: 2 records

**Total: 35 records**

## 🔄 Restore to New Instance

### Option A: Create New Supabase Project

#### Step 1: Create New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose your organization
4. Enter project details:
   - **Name**: `phoenix-game` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait for project to be ready (2-3 minutes)

#### Step 2: Get Project Credentials

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key
   - **service_role** key (if needed)

#### Step 3: Set Up Environment

1. Create `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres
```

#### Step 4: Create Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL to create all tables:

```sql
-- Create telegram_users table
CREATE TABLE telegram_users (
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
CREATE TABLE customers (
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
CREATE TABLE customer_social_links (
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
CREATE TABLE daily_rewards (
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
CREATE TABLE payment_records (
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
CREATE TABLE user_referrals (
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
CREATE INDEX idx_telegram_users_username ON telegram_users(username);
CREATE INDEX idx_telegram_users_last_active ON telegram_users(last_active);
CREATE INDEX idx_customers_slug ON customers(slug);
CREATE INDEX idx_customer_social_links_customer_id ON customer_social_links(customer_id);
CREATE INDEX idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX payment_records_user_id_idx ON payment_records (user_id);
CREATE INDEX payment_records_charge_id_idx ON payment_records (charge_id);
CREATE INDEX idx_user_referrals_referrer_id ON user_referrals(referrer_id);
CREATE INDEX idx_user_referrals_referee_id ON user_referrals(referee_id);

-- Enable RLS on payment_records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to service role" ON payment_records
    USING (true) WITH CHECK (true);
```

#### Step 5: Restore Your Data

1. **Create a restore script** (`restore_data.js`):

```javascript
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreData() {
  // Find the latest backup file
  const backupFiles = fs
    .readdirSync("supabase/backups")
    .filter(
      (file) => file.startsWith("phoenix_api_backup_") && file.endsWith(".json")
    )
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.error("❌ No backup files found");
    return;
  }

  const latestBackup = backupFiles[0];
  const backup = JSON.parse(
    fs.readFileSync(`supabase/backups/${latestBackup}`, "utf8")
  );

  console.log(`🔄 Restoring data from: ${latestBackup}`);

  // Restore each table
  for (const [tableName, result] of Object.entries(backup.tables)) {
    if (result.error || result.data.length === 0) {
      console.log(`⏭️  Skipping ${tableName}: ${result.error || "no data"}`);
      continue;
    }

    console.log(`📊 Restoring ${tableName}: ${result.data.length} records`);

    const { error } = await supabase.from(tableName).insert(result.data);

    if (error) {
      console.error(`❌ Error restoring ${tableName}:`, error.message);
    } else {
      console.log(`✅ ${tableName} restored successfully`);
    }
  }

  console.log("🎉 Data restoration complete!");
}

restoreData().catch(console.error);
```

2. **Run the restore script**:

```bash
node restore_data.js
```

### Option B: Use Existing Supabase Project

#### Step 1: Update Environment

1. Update your `.env.local` with the existing project credentials
2. Make sure you have access to the project

#### Step 2: Check Schema

1. Go to **Table Editor** in Supabase Dashboard
2. Verify all required tables exist
3. If tables are missing, run the schema creation SQL from Option A

#### Step 3: Restore Data

1. Follow the same restore process as Option A, Step 5

### ✅ Verification Steps

1. **Check data in Supabase Dashboard**:

   - Go to **Table Editor**
   - Verify all tables have data
   - Check record counts match your backup

2. **Test your application**:

   - Start your app: `npm run dev`
   - Test user registration
   - Test data operations

3. **Run backup to verify**:
   ```bash
   node supabase/backups/api_backup.js
   node supabase/backups/view_data.js
   ```

### 🚨 Troubleshooting

- **Permission errors**: Check your API keys and RLS policies
- **Schema errors**: Make sure all tables were created correctly
- **Data errors**: Check for foreign key constraints and data types
- **Connection errors**: Verify your `.env.local` file has correct credentials

## 📋 Prerequisites

- Node.js installed
- .env.local file with Supabase credentials
- Internet connection

## 🔧 Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📝 Notes

- Uses Supabase API (no Docker required)
- Creates JSON backups with all your data
- Simple and reliable backup/restore process
- All 35 records from your database are safely backed up

#!/usr/bin/env node

// =====================================================
// API-BASED DATABASE BACKUP
// Uses Supabase API to get all data
// =====================================================

/*
CURSOR PROMPT FOR AUTOMATIC DATABASE BACKUP:

I need to create a complete backup of my Phoenix Game database. Please help me:

1. Connect to Supabase using credentials from .env.local
2. Backup all tables with data:
   - telegram_users (user data and game state)
   - customers (customer information)
   - customer_social_links (social media links with click tracking)
   - daily_rewards (daily reward system)
   - payment_records (payment transactions)
   - user_referrals (referral system)
3. Save backup as JSON file with timestamp
4. Verify backup contains all data
5. Provide summary of what was backed up

The backup should include all 35 records from the database.
Please run this script and ensure the backup is complete and usable for restore.
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define all tables to backup
const tables = [
  "telegram_users",
  "customers",
  "customer_social_links",
  "user_task_completion",
  "daily_rewards",
  "payment_records",
  "user_referrals",
];

async function backupTable(tableName) {
  console.log(`📊 Backing up table: ${tableName}`);

  try {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error.message);
      return { table: tableName, data: [], error: error.message };
    }

    console.log(`✅ ${tableName}: ${data.length} records`);
    return { table: tableName, data: data, error: null };
  } catch (error) {
    console.error(`❌ Error backing up ${tableName}:`, error.message);
    return { table: tableName, data: [], error: error.message };
  }
}

async function createBackup() {
  console.log("🚀 Starting API-based database backup...");
  console.log("📊 Tables to backup:", tables.join(", "));

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `supabase/backups/phoenix_api_backup_${timestamp}.json`;

  const backup = {
    timestamp: new Date().toISOString(),
    database: {
      url: supabaseUrl,
      project_id: "xmsyjijnribmnfundfto",
    },
    tables: {},
  };

  // Backup each table
  for (const tableName of tables) {
    const result = await backupTable(tableName);
    backup.tables[tableName] = result;
  }

  // Write backup to file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  console.log(`\n✅ API backup completed successfully!`);
  console.log(`📁 Backup saved to: ${backupFile}`);

  // Show summary
  console.log("\n📋 Backup Summary:");
  let totalRecords = 0;
  for (const [tableName, result] of Object.entries(backup.tables)) {
    if (result.error) {
      console.log(`❌ ${tableName}: ${result.error}`);
    } else {
      console.log(`✅ ${tableName}: ${result.data.length} records`);
      totalRecords += result.data.length;
    }
  }

  console.log(`\n📊 Total records backed up: ${totalRecords}`);
  console.log(
    `📏 File size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(
      2
    )} MB`
  );

  return backupFile;
}

// Run the backup
createBackup().catch(console.error);

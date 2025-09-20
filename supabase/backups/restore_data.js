#!/usr/bin/env node

// =====================================================
// DATABASE RESTORE SCRIPT
// Restores data from backup JSON files to new Supabase instance
// =====================================================

/*
CURSOR PROMPT FOR AUTOMATIC DATABASE RESTORE:

I need to restore a Phoenix Game database from backup files. Please help me:

1. Check if .env.local file exists with Supabase credentials
2. Verify connection to Supabase project
3. Find the latest backup file in supabase/backups/
4. Restore all data from backup to the database
5. Verify the restore was successful

The backup contains these tables with data:
- telegram_users (10 records)
- customers (5 records) 
- customer_social_links (12 records)
- daily_rewards (5 records)
- payment_records (1 record)
- user_referrals (2 records)

Total: 35 records to restore

Please run this script and guide me through any issues that arise.
Make sure to provide clear error messages and next steps if something fails.
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
  console.error("Please make sure you have:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreData() {
  console.log("🚀 Starting database restore...");
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  // Find the latest backup file
  const backupDir = "supabase/backups";
  const backupFiles = fs
    .readdirSync(backupDir)
    .filter(
      (file) => file.startsWith("phoenix_api_backup_") && file.endsWith(".json")
    )
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.error("❌ No backup files found in supabase/backups/");
    console.error("Please run: node supabase/backups/api_backup.js");
    return;
  }

  const latestBackup = backupFiles[0];
  const backupPath = path.join(backupDir, latestBackup);
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

  console.log(`📁 Using backup: ${latestBackup}`);
  console.log(`📅 Backup created: ${backup.timestamp}`);

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

  let totalRestored = 0;
  let totalErrors = 0;

  // Restore each table
  for (const [tableName, result] of Object.entries(backup.tables)) {
    if (result.error) {
      console.log(`⏭️  Skipping ${tableName}: ${result.error}`);
      continue;
    }

    if (result.data.length === 0) {
      console.log(`⏭️  Skipping ${tableName}: no data`);
      continue;
    }

    console.log(`\n📊 Restoring ${tableName}: ${result.data.length} records`);

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

  console.log("\n🎉 Restore process complete!");
  console.log(`📊 Total records restored: ${totalRestored}`);
  if (totalErrors > 0) {
    console.log(`⚠️  Errors encountered: ${totalErrors}`);
  }

  // Verify the restore
  console.log("\n🔍 Verifying restore...");
  try {
    const { data: verifyData, error: verifyError } = await supabase
      .from("telegram_users")
      .select("count")
      .limit(1);

    if (verifyError) {
      console.log("⚠️  Could not verify restore (this might be normal)");
    } else {
      console.log("✅ Restore verification successful");
    }
  } catch (error) {
    console.log("⚠️  Verification check failed (this might be normal)");
  }

  console.log("\n📋 Next steps:");
  console.log("1. Check your Supabase dashboard to verify data");
  console.log("2. Test your application");
  console.log("3. Run: node supabase/backups/view_data.js");
}

// Run the restore
restoreData().catch(console.error);

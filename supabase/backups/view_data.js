#!/usr/bin/env node

// =====================================================
// VIEW BACKUP DATA
// =====================================================

const fs = require("fs");
const path = require("path");

// Find the latest backup file
const backupDir = "supabase/backups";
const files = fs
  .readdirSync(backupDir)
  .filter(
    (file) => file.startsWith("phoenix_api_backup_") && file.endsWith(".json")
  )
  .sort()
  .reverse();

if (files.length === 0) {
  console.log("❌ No backup files found");
  process.exit(1);
}

const latestBackup = files[0];
const backupFile = path.join(backupDir, latestBackup);

console.log(`📁 Reading backup: ${latestBackup}`);

try {
  const backup = JSON.parse(fs.readFileSync(backupFile, "utf8"));

  console.log("\n📊 DATABASE BACKUP SUMMARY");
  console.log("================================");
  console.log(`Timestamp: ${backup.timestamp}`);
  console.log(`Project: ${backup.database.project_id}`);
  console.log(`URL: ${backup.database.url}`);

  console.log("\n📋 TABLE DATA:");
  console.log("================================");

  let totalRecords = 0;
  for (const [tableName, result] of Object.entries(backup.tables)) {
    if (result.error) {
      console.log(`❌ ${tableName}: ${result.error}`);
    } else {
      console.log(`✅ ${tableName}: ${result.data.length} records`);
      totalRecords += result.data.length;

      // Show sample data for each table
      if (result.data.length > 0) {
        console.log(
          `   Sample:`,
          JSON.stringify(result.data[0], null, 2).substring(0, 200) + "..."
        );
      }
    }
  }

  console.log(`\n📊 TOTAL RECORDS: ${totalRecords}`);
  console.log(
    `📏 File size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`
  );
} catch (error) {
  console.error("❌ Error reading backup file:", error.message);
}

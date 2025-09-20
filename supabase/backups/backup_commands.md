# 🚀 Database Backup Commands

## ✅ Working Methods

### Option 1: API-Based Backup (Recommended)

```bash
# This gets ALL data using Supabase API
node supabase/backups/api_backup.js
```

### Option 2: View Your Backup Data

```bash
# View what's in your latest backup
node supabase/backups/view_data.js
```

### Option 3: Complete New Instance Setup

```bash
# Complete setup: create schema + restore data
node supabase/backups/setup_new_instance.js
```

### Option 4: Restore Data Only

```bash
# Restore data to existing schema
node supabase/backups/restore_data.js
```

## 📊 What You Get

- ✅ **All tables and data** (35 records total)
- ✅ **Complete JSON backup** ready for restore
- ✅ **No Docker required**
- ✅ **Uses your .env.local credentials**

## 🔄 To Restore to New Instance

1. **Set up your new Supabase project**
2. **Copy your .env.local file** to the new project
3. **Run the API backup script** to restore data:
   ```bash
   node supabase/backups/api_backup.js
   ```

## 📁 Backup Files

- **`phoenix_api_backup_*.json`** - Your complete data backup
- **`api_backup.js`** - Script to create backups
- **`view_data.js`** - Script to view backup contents

## 🎯 Quick Commands

```bash
# Complete new instance setup (schema + data)
node supabase/backups/setup_new_instance.js

# Create backup
node supabase/backups/api_backup.js

# View backup
node supabase/backups/view_data.js

# Restore data only
node supabase/backups/restore_data.js
```

**That's it! Simple and reliable.** 🎉

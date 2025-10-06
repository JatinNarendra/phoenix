-- Fix RLS policies for telegram_users table
-- Since we're using service role authentication through API routes,
-- we can disable RLS for this table or create more permissive policies

-- Option 1: Disable RLS for telegram_users (recommended for your setup)
ALTER TABLE telegram_users DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create more permissive policies (uncomment if you prefer this approach)
-- DROP POLICY IF EXISTS "Users can view their own data" ON telegram_users;
-- DROP POLICY IF EXISTS "Users can update their own data" ON telegram_users;
-- DROP POLICY IF EXISTS "Users can insert their own data" ON telegram_users;

-- CREATE POLICY "Allow service role access" ON telegram_users
--     FOR ALL USING (true);

-- Option 3: Alternative - Create policies that work with anon key (uncomment if you prefer this approach)
-- DROP POLICY IF EXISTS "Users can view their own data" ON telegram_users;
-- DROP POLICY IF EXISTS "Users can update their own data" ON telegram_users;
-- DROP POLICY IF EXISTS "Users can insert their own data" ON telegram_users;

-- CREATE POLICY "Allow anon access to telegram_users" ON telegram_users
--     FOR ALL TO anon USING (true);

-- CREATE POLICY "Allow authenticated access to telegram_users" ON telegram_users
--     FOR ALL TO authenticated USING (true);

-- Verify the changes
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'telegram_users';
-- Quick fix for customer deletion RLS issues
-- Run this in your Supabase SQL editor

-- Option 1: Temporarily disable RLS for customers table (quickest fix)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_social_links DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, uncomment these instead:
-- CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true);
-- CREATE POLICY "Allow all operations on social links" ON customer_social_links FOR ALL USING (true);

-- Verify the changes
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('customers', 'customer_social_links');

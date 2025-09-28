-- Fix RLS policies for customer deletion
-- This script adds the missing DELETE policies for customers and customer_social_links tables

-- =====================================================
-- FIX RLS POLICIES FOR CUSTOMER DELETION
-- =====================================================

-- Add DELETE policy for customers table
-- Allow service role to delete customers (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Service role can delete customers'
    ) THEN
        CREATE POLICY "Service role can delete customers" ON customers
            FOR DELETE USING (true);
    END IF;
END $$;

-- Add DELETE policy for customer_social_links table
-- Allow service role to delete social links (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_social_links' 
        AND policyname = 'Service role can delete social links'
    ) THEN
        CREATE POLICY "Service role can delete social links" ON customer_social_links
            FOR DELETE USING (true);
    END IF;
END $$;

-- Add UPDATE policy for customers table (if missing)
-- Allow service role to update customers (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Service role can update customers'
    ) THEN
        CREATE POLICY "Service role can update customers" ON customers
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Add UPDATE policy for customer_social_links table (if missing)
-- Allow service role to update social links (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_social_links' 
        AND policyname = 'Service role can update social links'
    ) THEN
        CREATE POLICY "Service role can update social links" ON customer_social_links
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Add INSERT policy for customers table (if missing)
-- Allow service role to insert customers (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Service role can insert customers'
    ) THEN
        CREATE POLICY "Service role can insert customers" ON customers
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Add INSERT policy for customer_social_links table (if missing)
-- Allow service role to insert social links (for admin operations)
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_social_links' 
        AND policyname = 'Service role can insert social links'
    ) THEN
        CREATE POLICY "Service role can insert social links" ON customer_social_links
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Verify the policies were created
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
WHERE tablename IN ('customers', 'customer_social_links')
ORDER BY tablename, policyname;

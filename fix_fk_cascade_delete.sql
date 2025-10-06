-- Fix foreign key constraint for user_task_completions to enable CASCADE DELETE
-- This will allow customer deletion to work properly

-- First, drop the existing foreign key constraint
ALTER TABLE user_task_completions 
DROP CONSTRAINT IF EXISTS user_task_completions_task_id_fkey;

-- Recreate the foreign key constraint with CASCADE DELETE
ALTER TABLE user_task_completions 
ADD CONSTRAINT user_task_completions_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES customer_social_links(id) ON DELETE CASCADE;

-- Verify the constraint was created
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_task_completions';

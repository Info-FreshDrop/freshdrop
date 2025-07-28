-- First, let's see the current foreign keys on the orders table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='orders';

-- Now add the relationship between orders.customer_id and profiles.user_id
-- We need to drop the existing constraint to auth.users first
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- Add the correct foreign key to profiles table
ALTER TABLE public.orders 
ADD CONSTRAINT orders_customer_id_profiles_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
-- Check the current foreign key constraints on orders table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='orders';

-- Drop the incorrect washer_id foreign key if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_washer_id_fkey;

-- Add the correct foreign key to washers table
ALTER TABLE public.orders 
ADD CONSTRAINT orders_washer_id_washers_fkey 
FOREIGN KEY (washer_id) REFERENCES public.washers(id) ON DELETE SET NULL;
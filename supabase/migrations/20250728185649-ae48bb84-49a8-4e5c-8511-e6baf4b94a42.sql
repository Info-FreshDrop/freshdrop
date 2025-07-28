-- Let's check what enum values exist for pickup_type and service_type
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('pickup_type', 'service_type', 'order_status')
ORDER BY t.typname, e.enumsortorder;
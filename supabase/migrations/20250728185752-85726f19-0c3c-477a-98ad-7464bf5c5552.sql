-- Let's first check what user IDs we have in profiles
SELECT user_id, first_name, last_name FROM public.profiles LIMIT 5;

-- Then create a test order using the operator's user_id as customer (just for testing)
INSERT INTO public.orders (
  customer_id,
  pickup_type,
  service_type,
  status,
  total_amount_cents,
  zip_code,
  pickup_address,
  delivery_address,
  special_instructions,
  bag_count,
  created_at
) 
SELECT 
  'c569fb65-622a-49bd-965c-c9f8f89cb558'::uuid,  -- operator user_id from the network logs
  'pickup_delivery'::pickup_type,
  'wash_fold'::service_type,
  'unclaimed'::order_status,
  2500,
  '65804',
  '123 Test Pickup Street, Springfield, MO 65804',
  '123 Test Delivery Street, Springfield, MO 65804',
  'Test order to verify operator dashboard functionality',
  2,
  now();
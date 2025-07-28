-- Create a test order with correct enum values
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
) VALUES (
  (SELECT user_id FROM public.profiles WHERE first_name = 'Test' AND last_name = 'operator' LIMIT 1),
  'pickup_delivery',
  'wash_fold',
  'unclaimed',
  2500,
  '65804',
  '123 Test Pickup Street, Springfield, MO 65804',
  '123 Test Delivery Street, Springfield, MO 65804',
  'Test order to verify operator dashboard functionality',
  2,
  now()
);
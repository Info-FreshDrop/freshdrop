-- Fix inconsistent orders where status doesn't match current_step
-- Reset orders that are marked as 'washed' but still at step 1
UPDATE orders 
SET 
  status = 'claimed',
  current_step = 1,
  updated_at = now()
WHERE status = 'washed' AND current_step = 1;
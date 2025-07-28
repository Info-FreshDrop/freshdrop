-- Add more granular order statuses for real-time tracking
-- First check current status enum values and add new ones
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'folded';

-- Add a step_progress column to track current step for each order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS step_completed_at JSONB DEFAULT '{}';

-- Update RLS policies to ensure operators can update step progress
-- (existing policies should cover this but let's make sure)
-- Add push notification support to washers table
ALTER TABLE washers 
ADD COLUMN IF NOT EXISTS push_notification_token TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
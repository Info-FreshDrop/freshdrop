-- Add marketing role to the app_role enum if it doesn't exist
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'marketing';
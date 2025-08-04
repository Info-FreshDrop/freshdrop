-- Fix auth security settings
-- Enable password leak protection and set secure OTP expiry

-- Update auth config to enable leaked password protection
UPDATE auth.config 
SET password_leak_protection = true 
WHERE id = 1;

-- Set OTP expiry to 5 minutes (300 seconds) for better security
UPDATE auth.config 
SET otp_expiry = 300 
WHERE id = 1;
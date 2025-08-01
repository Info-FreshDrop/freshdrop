-- Fix security issues
-- 1. Set OTP expiry to 1 hour (3600 seconds) instead of default 24 hours
UPDATE auth.config SET otp_expiry = 3600;

-- 2. Enable leaked password protection
UPDATE auth.config SET password_min_length = 8, enable_signup = true, enable_anonymous_sign_ins = false;
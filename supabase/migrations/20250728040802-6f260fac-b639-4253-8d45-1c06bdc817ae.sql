-- Create washer record for the operator user
INSERT INTO public.washers (user_id, zip_codes, is_online, approval_status, is_active, locker_access)
VALUES (
  'c569fb65-622a-49bd-965c-c9f8f89cb558',
  ARRAY['65804'],
  true,
  'approved',
  true,
  ARRAY[]::uuid[]
);
-- Add availability and schedule fields to washers table
ALTER TABLE public.washers 
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{
  "monday": {"available": false, "time_slots": []},
  "tuesday": {"available": false, "time_slots": []},
  "wednesday": {"available": false, "time_slots": []},
  "thursday": {"available": false, "time_slots": []},
  "friday": {"available": false, "time_slots": []},
  "saturday": {"available": false, "time_slots": []},
  "sunday": {"available": false, "time_slots": []}
}'::jsonb,
ADD COLUMN IF NOT EXISTS available_time_slots TEXT[] DEFAULT ARRAY['morning', 'evening', 'night'],
ADD COLUMN IF NOT EXISTS max_orders_per_day INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER DEFAULT 10;
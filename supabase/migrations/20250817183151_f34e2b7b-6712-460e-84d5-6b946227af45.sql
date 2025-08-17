-- Create services table to make prices and service info editable by owners
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  base_price_cents integer NOT NULL DEFAULT 1500, -- $15.00 default
  duration_hours integer NOT NULL DEFAULT 24,
  icon_name text NOT NULL DEFAULT 'droplets',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  price_display text, -- e.g. "From $15" - auto-generated but can be overridden
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies - everyone can view active services, only owners can manage
CREATE POLICY "Everyone can view active services" 
ON public.services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage all services" 
ON public.services 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Insert default services
INSERT INTO public.services (name, title, description, base_price_cents, duration_hours, icon_name, display_order) VALUES
('wash_fold', 'Wash & Fold', 'Professional washing, drying, and folding', 1500, 24, 'droplets', 1),
('express', 'Express Service', 'Same-day laundry service', 2500, 6, 'timer', 2),
('locker_pickup', 'Locker Pickup', 'Drop off at smart lockers', 1200, 36, 'map-pin', 3),
('door_to_door', 'Door-to-Door', 'Full pickup and delivery service', 2000, 36, 'users', 4);

-- Create function to auto-generate price display
CREATE OR REPLACE FUNCTION public.update_price_display()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price_display IS NULL OR NEW.price_display = '' THEN
    NEW.price_display := 'From $' || (NEW.base_price_cents / 100.0)::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating price display and updated_at
CREATE TRIGGER update_services_price_display
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_price_display();

-- Create business configuration for general settings that owners can edit
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('service_pricing', '{"currency": "USD", "tax_rate": 0.0, "minimum_order": 10.00}', 'General pricing configuration'),
('service_areas', '{"default_radius_miles": 10, "express_radius_miles": 5}', 'Service area configuration'),
('business_hours', '{"monday": {"start": "06:00", "end": "22:00"}, "tuesday": {"start": "06:00", "end": "22:00"}, "wednesday": {"start": "06:00", "end": "22:00"}, "thursday": {"start": "06:00", "end": "22:00"}, "friday": {"start": "06:00", "end": "22:00"}, "saturday": {"start": "08:00", "end": "20:00"}, "sunday": {"start": "08:00", "end": "20:00"}}', 'Business operating hours')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
updated_at = now();
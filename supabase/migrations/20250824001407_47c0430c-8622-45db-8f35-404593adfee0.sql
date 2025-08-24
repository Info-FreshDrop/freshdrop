-- Create bag_sizes table for dynamic pricing
CREATE TABLE public.bag_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity_gallons INTEGER,
  price_cents INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bag_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active bag sizes" 
ON public.bag_sizes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage all bag sizes" 
ON public.bag_sizes 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_bag_sizes_updated_at
BEFORE UPDATE ON public.bag_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default bag sizes based on current pricing
INSERT INTO public.bag_sizes (name, description, capacity_gallons, price_cents, display_order) VALUES
('Small Bag', 'Perfect for 1-2 people, includes shirts, pants, and undergarments', 13, 3500, 1),
('Large Bag', 'Great for families or larger loads, includes bulky items like comforters', 30, 6000, 2);

-- Update business_settings to remove hardcoded bag pricing (if it exists)
DELETE FROM public.business_settings WHERE setting_key = 'bag_pricing';
-- Create laundry_preferences table for soap and temperature options
CREATE TABLE public.laundry_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'soap', 'wash_temp', 'dry_temp'
  price_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.laundry_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active preferences" 
ON public.laundry_preferences 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage preferences" 
ON public.laundry_preferences 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add laundry preferences to orders table
ALTER TABLE public.orders 
ADD COLUMN soap_preference_id UUID REFERENCES public.laundry_preferences(id),
ADD COLUMN wash_temp_preference_id UUID REFERENCES public.laundry_preferences(id),
ADD COLUMN dry_temp_preference_id UUID REFERENCES public.laundry_preferences(id);

-- Add trigger for updating timestamps
CREATE TRIGGER update_laundry_preferences_updated_at
BEFORE UPDATE ON public.laundry_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default laundry preferences
INSERT INTO public.laundry_preferences (name, category, price_cents, description, is_default, is_active) VALUES
-- Soap preferences
('Scented (Default)', 'soap', 0, 'Regular scented detergent', true, true),
('Scent-Free & Clear Hypoallergenic', 'soap', 200, 'Gentle, fragrance-free detergent for sensitive skin', false, true),

-- Wash temperature preferences
('Cold', 'wash_temp', 0, 'Cold water wash (recommended for most fabrics)', true, true),
('Warm', 'wash_temp', 0, 'Warm water wash', false, true),
('Hot', 'wash_temp', 0, 'Hot water wash (for whites and heavily soiled items)', false, true),

-- Dry temperature preferences
('Low', 'dry_temp', 0, 'Low heat drying (gentle on fabrics)', false, true),
('Medium', 'dry_temp', 0, 'Medium heat drying (standard)', true, true),
('High', 'dry_temp', 0, 'High heat drying (for towels and heavy items)', false, true),
('Air Dry', 'dry_temp', 0, 'No heat - air dry only', false, true);

-- Update clothes_items to support expanded shop categories
UPDATE public.clothes_items 
SET category = 'Laundry Services' 
WHERE category IN ('Regular', 'Delicate', 'Express', 'Special');

-- Insert retail items for the clothes shop
INSERT INTO public.clothes_items (name, category, price_cents, description, is_active) VALUES
-- Basic clothes
('White T-Shirt', 'Basic Clothing', 1500, 'Cotton white t-shirt', true),
('Black T-Shirt', 'Basic Clothing', 1500, 'Cotton black t-shirt', true),
('Blue Jeans', 'Basic Clothing', 4500, 'Classic denim jeans', true),
('Polo Shirt', 'Basic Clothing', 2500, 'Cotton polo shirt', true),

-- Bed sheets
('Twin Sheet Set', 'Bedding', 3500, 'Cotton twin bed sheet set', true),
('Queen Sheet Set', 'Bedding', 4500, 'Cotton queen bed sheet set', true),
('King Sheet Set', 'Bedding', 5500, 'Cotton king bed sheet set', true),
('Pillowcase Set', 'Bedding', 1500, 'Set of 2 cotton pillowcases', true),

-- Laundry accessories
('Stain Remover Pen', 'Laundry Accessories', 350, 'Portable stain remover pen', true),
('Safety Pins Pack', 'Laundry Accessories', 250, 'Pack of 20 safety pins', true),
('Laundry Hamper', 'Laundry Accessories', 2500, 'Collapsible mesh laundry hamper', true),
('Fabric Softener Sheets', 'Laundry Accessories', 450, 'Pack of dryer sheets', true);
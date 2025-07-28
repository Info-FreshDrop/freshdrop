-- Create promo_codes table for managing promotional discount codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for promo codes
CREATE POLICY "Everyone can view active promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage promo codes" 
ON public.promo_codes 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
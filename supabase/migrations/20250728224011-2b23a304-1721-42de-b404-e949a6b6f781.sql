-- Add new fields to promo_codes table for one-time use and item restrictions
ALTER TABLE public.promo_codes 
ADD COLUMN one_time_use_per_user BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN restricted_to_item_ids UUID[] DEFAULT NULL;

-- Create a table to track promo code usage per user
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- Enable RLS on promo_code_usage
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for promo_code_usage
CREATE POLICY "Users can view their own promo code usage" 
ON public.promo_code_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create promo code usage" 
ON public.promo_code_usage 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Owners can manage all promo code usage" 
ON public.promo_code_usage 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_promo_code_usage_updated_at
BEFORE UPDATE ON public.promo_code_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
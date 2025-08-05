-- Create order_content table for managing order flow content
CREATE TABLE public.order_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key TEXT NOT NULL UNIQUE,
  content_text TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_settings table for general application settings
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for order_content
CREATE POLICY "Everyone can view active order content" 
ON public.order_content 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage order content" 
ON public.order_content 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create policies for app_settings
CREATE POLICY "Everyone can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Owners can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_order_content_updated_at
BEFORE UPDATE ON public.order_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default order flow content
INSERT INTO public.order_content (content_key, content_text, content_type) VALUES
('pickup_title', 'When would you like your laundry picked up?', 'text'),
('pickup_subtitle', 'Choose a convenient time for our operator to collect your items', 'text'),
('delivery_title', 'When would you like your laundry delivered?', 'text'),
('delivery_subtitle', 'Select when you want your fresh, clean laundry returned', 'text'),
('special_instructions_label', 'Special Instructions (Optional)', 'text'),
('special_instructions_placeholder', 'Any special care instructions, stain notes, or preferences...', 'text'),
('bag_count_label', 'How many bags of laundry do you have?', 'text'),
('order_summary_title', 'Order Summary', 'text'),
('payment_title', 'Payment Information', 'text'),
('order_confirmation_title', 'Order Confirmed!', 'text'),
('order_confirmation_message', 'Thank you for choosing FreshDrop! Your laundry will be picked up during your selected time window.', 'text');

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('pickup_time_validation', '{"min_hours_advance": 1, "max_days_advance": 14}', 'Time validation rules for pickup scheduling'),
('time_windows', '{"morning": {"start": "06:00", "end": "08:00", "enabled": true}, "lunch": {"start": "12:00", "end": "14:00", "enabled": true}, "evening": {"start": "17:00", "end": "19:00", "enabled": true}}', 'Available pickup/delivery time windows');
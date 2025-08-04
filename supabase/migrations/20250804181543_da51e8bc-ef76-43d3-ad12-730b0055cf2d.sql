-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for notification templates
CREATE POLICY "Owners can manage notification templates" 
ON public.notification_templates 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification templates
INSERT INTO public.notification_templates (status, subject, message) VALUES
('claimed', 'Order Claimed - Fresh Drop', 'Great news! Your laundry order has been claimed by one of our professional operators and will be picked up soon.'),
('picked_up', 'Order Picked Up - Fresh Drop', 'Your laundry has been picked up and is on its way to be cleaned with care.'),
('washing', 'Washing Started - Fresh Drop', 'Your clothes are now being washed with premium detergents and care.'),
('rinsing', 'Rinse Cycle - Fresh Drop', 'Your laundry is in the rinse cycle, almost ready for drying.'),
('drying', 'Drying Started - Fresh Drop', 'Your clothes are now in the drying process and will be ready soon.'),
('folding', 'Folding & Packaging - Fresh Drop', 'Your clean laundry is being carefully folded and packaged for delivery.'),
('delivering', 'Out for Delivery - Fresh Drop', 'Your fresh, clean laundry is out for delivery and will arrive soon!'),
('completed', 'Order Completed - Fresh Drop', 'Your laundry order has been completed and delivered. Thank you for choosing Fresh Drop!'),
('cancelled', 'Order Cancelled - Fresh Drop', 'Your laundry order has been cancelled. If you have any questions, please contact our support team.');
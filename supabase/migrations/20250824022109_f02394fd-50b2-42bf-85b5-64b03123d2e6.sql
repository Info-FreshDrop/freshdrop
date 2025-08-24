-- Create operator notification templates table
CREATE TABLE public.operator_notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL, -- 'new_order', 'broadcast', etc.
  channel TEXT NOT NULL, -- 'email', 'sms'
  subject TEXT NOT NULL, -- For emails
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_type, channel)
);

-- Enable RLS
ALTER TABLE public.operator_notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owners can manage operator notification templates" 
ON public.operator_notification_templates 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Insert default templates
INSERT INTO public.operator_notification_templates (notification_type, channel, subject, message) VALUES
('new_order', 'email', 'New Order Available - {serviceName}', 
'Hello {operatorName},

A new order is available in your area!

Order Details:
- Service: {serviceName}
- Location: {zipCode}
- Estimated Earnings: ${earnings}
{expressBadge}

Order ID: {orderId}

Log into the FreshDrop app to claim this order.

Best regards,
FreshDrop Team'),

('new_order', 'sms', 'FreshDrop: New Order Available', 
'New order available! {serviceName} in {zipCode} - ${earnings}{expressText}. Order: {orderNumber}'),

('broadcast', 'email', 'Important Update from FreshDrop', 
'Hello {operatorName},

{message}

Best regards,
FreshDrop Team'),

('broadcast', 'sms', 'FreshDrop Update', '{message}');

-- Add trigger for updated_at
CREATE TRIGGER update_operator_notification_templates_updated_at
BEFORE UPDATE ON public.operator_notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
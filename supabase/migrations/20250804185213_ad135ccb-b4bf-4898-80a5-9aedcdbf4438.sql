-- Enhance notification_templates table for marketing campaigns
ALTER TABLE public.notification_templates 
ADD COLUMN campaign_type text DEFAULT 'operational',
ADD COLUMN schedule_type text DEFAULT 'immediate',
ADD COLUMN schedule_date timestamp with time zone,
ADD COLUMN trigger_conditions jsonb DEFAULT '{}',
ADD COLUMN recurring_pattern text,
ADD COLUMN target_segment text,
ADD COLUMN personalization_data jsonb DEFAULT '{}';

-- Create marketing campaigns table
CREATE TABLE public.marketing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL, -- 'holiday', 'retention', 'feedback', 'promotional'
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed', 'paused'
  template_id uuid REFERENCES public.notification_templates(id),
  target_segment text,
  schedule_date timestamp with time zone,
  recurring_pattern text, -- 'daily', 'weekly', 'monthly', 'none'
  trigger_conditions jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone
);

-- Create customer segments table
CREATE TABLE public.customer_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  segment_type text NOT NULL, -- 'behavioral', 'geographic', 'demographic', 'custom'
  conditions jsonb NOT NULL,
  customer_count integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create campaign triggers table for behavioral automation
CREATE TABLE public.campaign_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trigger_type text NOT NULL, -- 'inactivity', 'post_order', 'milestone', 'abandoned_cart'
  conditions jsonb NOT NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  delay_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create notification delivery log for tracking
CREATE TABLE public.notification_delivery_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id),
  template_id uuid REFERENCES public.notification_templates(id),
  notification_type text NOT NULL, -- 'email', 'sms', 'push'
  recipient text NOT NULL,
  subject text,
  message_content text,
  status text NOT NULL, -- 'sent', 'delivered', 'failed', 'opened', 'clicked'
  delivery_provider text, -- 'resend', 'twilio', 'firebase'
  provider_message_id text,
  sent_at timestamp with time zone DEFAULT now(),
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'
);

-- Create campaign analytics table
CREATE TABLE public.campaign_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  revenue_cents integer DEFAULT 0,
  bounce_count integer DEFAULT 0,
  unsubscribe_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for marketing campaigns
CREATE POLICY "Owners can manage marketing campaigns" 
ON public.marketing_campaigns 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create policies for customer segments
CREATE POLICY "Owners can manage customer segments" 
ON public.customer_segments 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create policies for campaign triggers
CREATE POLICY "Owners can manage campaign triggers" 
ON public.campaign_triggers 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create policies for notification delivery log
CREATE POLICY "Owners can view delivery logs" 
ON public.notification_delivery_log 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "System can insert delivery logs" 
ON public.notification_delivery_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update delivery logs" 
ON public.notification_delivery_log 
FOR UPDATE 
USING (true);

-- Create policies for campaign analytics
CREATE POLICY "Owners can view campaign analytics" 
ON public.campaign_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "System can manage analytics" 
ON public.campaign_analytics 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_schedule_date ON public.marketing_campaigns(schedule_date);
CREATE INDEX idx_notification_delivery_log_customer_id ON public.notification_delivery_log(customer_id);
CREATE INDEX idx_notification_delivery_log_campaign_id ON public.notification_delivery_log(campaign_id);
CREATE INDEX idx_notification_delivery_log_sent_at ON public.notification_delivery_log(sent_at);
CREATE INDEX idx_campaign_analytics_campaign_date ON public.campaign_analytics(campaign_id, date);

-- Create triggers for updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_segments_updated_at
BEFORE UPDATE ON public.customer_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_triggers_updated_at
BEFORE UPDATE ON public.campaign_triggers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_delivery_log_updated_at
BEFORE UPDATE ON public.notification_delivery_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_analytics_updated_at
BEFORE UPDATE ON public.campaign_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
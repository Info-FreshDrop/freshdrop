-- Create table for featured operators showcase
CREATE TABLE public.featured_operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  experience TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  specialties TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.featured_operators ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view featured operators" 
ON public.featured_operators 
FOR SELECT 
USING (is_featured = true);

CREATE POLICY "Owners can manage featured operators" 
ON public.featured_operators 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create table for trust metrics
CREATE TABLE public.trust_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  value TEXT NOT NULL,
  icon_name TEXT NOT NULL, -- Store lucide icon name
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trust_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active trust metrics" 
ON public.trust_metrics 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage trust metrics" 
ON public.trust_metrics 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create triggers for timestamp updates
CREATE TRIGGER update_featured_operators_updated_at
BEFORE UPDATE ON public.featured_operators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trust_metrics_updated_at
BEFORE UPDATE ON public.trust_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default trust metrics
INSERT INTO public.trust_metrics (title, description, value, icon_name, display_order) VALUES
('Background Checked', 'All operators undergo thorough background verification', '100%', 'Shield', 1),
('Customer Satisfaction', 'Average rating across all completed orders', '4.9/5', 'Award', 2),
('Orders Completed', 'Successfully processed orders this month', '15,000+', 'CheckCircle', 3);
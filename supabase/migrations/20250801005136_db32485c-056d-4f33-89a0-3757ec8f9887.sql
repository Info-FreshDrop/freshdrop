-- Create table for customer testimonials (Hero section)
CREATE TABLE public.customer_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_initial TEXT NOT NULL, -- e.g., "Sarah M."
  image_url TEXT,
  testimonial_text TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view featured testimonials" 
ON public.customer_testimonials 
FOR SELECT 
USING (is_featured = true);

CREATE POLICY "Owners can manage testimonials" 
ON public.customer_testimonials 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create table for homepage content sections (editable text content)
CREATE TABLE public.homepage_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE, -- 'hero_title', 'hero_subtitle', 'services_title', etc.
  content_text TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'html', 'markdown'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active content" 
ON public.homepage_content 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage content" 
ON public.homepage_content 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create table for process photos/content images
CREATE TABLE public.content_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL, -- 'how_it_works_locker', 'how_it_works_pickup', 'services_team', etc.
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active images" 
ON public.content_images 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage images" 
ON public.content_images 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create triggers for timestamp updates
CREATE TRIGGER update_customer_testimonials_updated_at
BEFORE UPDATE ON public.customer_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homepage_content_updated_at
BEFORE UPDATE ON public.homepage_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_images_updated_at
BEFORE UPDATE ON public.content_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default homepage content
INSERT INTO public.homepage_content (section_key, content_text) VALUES
('hero_title', 'Laundry made easy'),
('hero_subtitle', 'Professional laundry service with 24-hour turnaround. Drop off at any locker or schedule pickup & delivery. Eco-friendly, secure, and contactless.'),
('services_title', 'Our Services'),
('services_subtitle', 'Professional laundry service designed for your busy lifestyle. From quick express service to convenient locker options, we''ve got you covered.'),
('trust_hero_title', 'Trusted by Real People'),
('team_title', 'Meet Our Professional Team'),
('team_subtitle', 'Trusted, background-checked operators who care about your clothes'),
('how_it_works_title', 'How It Works'),
('how_it_works_subtitle', 'Choose the service method that works best for you. Both options are designed for maximum convenience and flexibility.');

-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

-- Create storage policies for content images
CREATE POLICY "Content images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-images');

CREATE POLICY "Owners can upload content images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content-images' AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update content images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content-images' AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete content images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content-images' AND has_role(auth.uid(), 'owner'::app_role));
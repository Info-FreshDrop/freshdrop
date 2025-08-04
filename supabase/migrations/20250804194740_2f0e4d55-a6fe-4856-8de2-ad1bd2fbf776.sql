-- Create storage bucket for marketing content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketing-content', 'marketing-content', true);

-- Create content library table for organizing uploaded content
CREATE TABLE public.content_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  folder_path TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Create policies for content library
CREATE POLICY "Owners can manage all content" 
ON public.content_library 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Users can view their own content" 
ON public.content_library 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content" 
ON public.content_library 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" 
ON public.content_library 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create storage policies for marketing content bucket
CREATE POLICY "Anyone can view marketing content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'marketing-content');

CREATE POLICY "Authenticated users can upload marketing content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'marketing-content' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own marketing content" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'marketing-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own marketing content" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'marketing-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updating timestamps
CREATE TRIGGER update_content_library_updated_at
BEFORE UPDATE ON public.content_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
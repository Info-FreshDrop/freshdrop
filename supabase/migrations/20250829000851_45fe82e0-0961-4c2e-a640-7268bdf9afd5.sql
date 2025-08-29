-- Create storage bucket for tax documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tax-documents', 'tax-documents', false);

-- Create RLS policies for tax documents bucket
CREATE POLICY "Users can upload their own tax documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own tax documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own tax documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own tax documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Create storage bucket for shop item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-photos', 'shop-photos', true);

-- Create storage policies for shop photos
CREATE POLICY "Public can view shop photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shop-photos');

CREATE POLICY "Owners can upload shop photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shop-photos' AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update shop photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'shop-photos' AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete shop photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'shop-photos' AND has_role(auth.uid(), 'owner'::app_role));
-- Create storage bucket for application photos
INSERT INTO storage.buckets (id, name, public) VALUES ('application-photos', 'application-photos', true);

-- Create policies for application photo uploads
CREATE POLICY "Anyone can upload application photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'application-photos');

CREATE POLICY "Anyone can view application photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'application-photos');

CREATE POLICY "Anyone can update application photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'application-photos');

-- Add photo URL columns to operator_applications table
ALTER TABLE operator_applications 
ADD COLUMN washer_photo_url TEXT,
ADD COLUMN washer_inside_photo_url TEXT,
ADD COLUMN dryer_photo_url TEXT,
ADD COLUMN dryer_inside_photo_url TEXT,
ADD COLUMN towel_photo_url TEXT,
ADD COLUMN tshirt_photo_url TEXT,
ADD COLUMN laundry_stack_photo_url TEXT,
ADD COLUMN laundry_area_photo_url TEXT;
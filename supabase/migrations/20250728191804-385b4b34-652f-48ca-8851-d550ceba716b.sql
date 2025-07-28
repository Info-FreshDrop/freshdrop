-- Create storage bucket for order photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-photos', 'order-photos', true);

-- Create policies for order photos
CREATE POLICY "Anyone can view order photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'order-photos');

CREATE POLICY "Operators can upload order photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'order-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Operators can update order photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'order-photos' AND auth.role() = 'authenticated');

-- Add additional photo fields to orders table for step photos
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS step_photos jsonb DEFAULT '{}';

-- Add comment to clarify photo fields
COMMENT ON COLUMN orders.pickup_photo_url IS 'Photo taken during pickup step';
COMMENT ON COLUMN orders.delivery_photo_url IS 'Photo taken during delivery step';
COMMENT ON COLUMN orders.step_photos IS 'JSON object storing photos for each workflow step';
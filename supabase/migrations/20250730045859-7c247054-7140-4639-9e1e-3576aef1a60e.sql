-- Create order_messages table for customer-operator communication
CREATE TABLE public.order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for order messages
CREATE POLICY "Users can view messages for their orders" 
ON public.order_messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  is_admin_role(auth.uid())
);

CREATE POLICY "Users can send messages for their orders" 
ON public.order_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id 
    AND (customer_id = auth.uid() OR washer_id IN (
      SELECT id FROM public.washers WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.order_messages 
FOR UPDATE 
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Create function for updating timestamps
CREATE TRIGGER update_order_messages_updated_at
BEFORE UPDATE ON public.order_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX idx_order_messages_created_at ON public.order_messages(created_at DESC);

-- Enable realtime for order_messages
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
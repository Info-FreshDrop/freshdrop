-- Add foreign key constraints to order_messages table
ALTER TABLE public.order_messages 
ADD CONSTRAINT order_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.order_messages 
ADD CONSTRAINT order_messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.order_messages 
ADD CONSTRAINT order_messages_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
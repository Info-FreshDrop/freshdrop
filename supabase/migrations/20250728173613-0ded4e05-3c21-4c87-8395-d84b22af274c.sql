-- Fix support tickets RLS policy to allow authenticated users to create tickets
DROP POLICY IF EXISTS "Customers can create tickets" ON public.support_tickets;

CREATE POLICY "Authenticated users can create tickets" 
ON public.support_tickets 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also allow users to update their own tickets
CREATE POLICY "Customers can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (auth.uid() = customer_id);
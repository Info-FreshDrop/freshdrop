-- Fix wallet RLS policy to allow users to create their own wallet
CREATE POLICY "Users can create their own wallet" 
ON public.wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
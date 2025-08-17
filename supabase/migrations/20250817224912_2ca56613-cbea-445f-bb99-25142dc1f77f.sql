-- COMPREHENSIVE SECURITY FIX FOR iOS APP STORE SUBMISSION
-- This migration addresses all critical security vulnerabilities found in the security scan

-- Phase 1: Fix RLS Policy Role Assignments (Change from public to authenticated)

-- Fix Operator Applications policies
DROP POLICY IF EXISTS "Owners can manage all applications" ON public.operator_applications;
CREATE POLICY "Owners can manage all applications" ON public.operator_applications
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- Fix Payment Methods policies  
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
FOR ALL 
TO authenticated
USING (auth.uid() = user_id);

-- Fix Pending Orders policies (CRITICAL: Remove dangerous system access)
DROP POLICY IF EXISTS "System can manage all pending orders" ON public.pending_orders;
DROP POLICY IF EXISTS "Users can manage their own pending orders" ON public.pending_orders;

CREATE POLICY "Users can manage their own pending orders" ON public.pending_orders
FOR ALL 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create pending orders" ON public.pending_orders
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix Profiles policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix Wallet Transactions policies (CRITICAL: Remove unrestricted system access)
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "System can create transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;

CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions
FOR ALL 
TO authenticated
USING (is_admin_role(auth.uid()));

CREATE POLICY "System can create transactions for authenticated users" ON public.wallet_transactions
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
FOR SELECT 
TO authenticated
USING (auth.uid() IN (
  SELECT wallets.user_id 
  FROM wallets 
  WHERE wallets.id = wallet_transactions.wallet_id
));

-- Phase 2: Fix Additional Critical Security Issues

-- Fix Order Messages - ensure proper authentication
DROP POLICY IF EXISTS "Users can send messages for their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.order_messages;

CREATE POLICY "Users can send messages for their orders" ON public.order_messages
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_messages.order_id 
      AND orders.customer_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM orders o 
      JOIN washers w ON w.id = o.washer_id 
      WHERE o.id = order_messages.order_id 
      AND w.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view messages for their orders" ON public.order_messages
FOR SELECT 
TO authenticated
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR 
  is_admin_role(auth.uid())
);

CREATE POLICY "Users can mark messages as read" ON public.order_messages
FOR UPDATE 
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Fix Support Tickets - ensure customers can only see their own tickets
DROP POLICY IF EXISTS "Customers can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.support_tickets;

CREATE POLICY "Customers can view their own tickets" ON public.support_tickets
FOR SELECT 
TO authenticated
USING (auth.uid() = customer_id OR is_admin_role(auth.uid()));

CREATE POLICY "Customers can update their own tickets" ON public.support_tickets
FOR UPDATE 
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Authenticated users can create tickets" ON public.support_tickets
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = customer_id);

-- Fix Order Ratings - ensure proper customer ownership
DROP POLICY IF EXISTS "Users can manage their own ratings" ON public.order_ratings;
DROP POLICY IF EXISTS "Admins can view all ratings" ON public.order_ratings;

CREATE POLICY "Customers can manage their own ratings" ON public.order_ratings
FOR ALL 
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all ratings" ON public.order_ratings
FOR SELECT 
TO authenticated
USING (is_admin_role(auth.uid()));

-- Fix Tips - ensure proper access control
DROP POLICY IF EXISTS "Customers can create tips" ON public.tips;
DROP POLICY IF EXISTS "Users can view their own tips" ON public.tips;

CREATE POLICY "Customers can create tips" ON public.tips
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view their own tips" ON public.tips
FOR SELECT 
TO authenticated
USING (
  auth.uid() = customer_id OR 
  auth.uid() = operator_id OR 
  is_admin_role(auth.uid())
);

-- Ensure all notification logs are properly secured
DROP POLICY IF EXISTS "System can insert notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "System can update notification logs" ON public.notification_logs;

CREATE POLICY "System can insert notification logs" ON public.notification_logs
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update notification logs" ON public.notification_logs
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix Wallets - ensure users can only access their own wallet
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

CREATE POLICY "Users can create their own wallet" ON public.wallets
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "Users can update their own wallet" ON public.wallets
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
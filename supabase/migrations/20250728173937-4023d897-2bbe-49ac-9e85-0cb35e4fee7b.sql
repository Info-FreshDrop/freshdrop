-- Create wallet system tables
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'tip', 'refund')),
  amount_cents INTEGER NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  operator_id UUID REFERENCES auth.users(id),
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved payment methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tips table
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.order_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  folding_quality_rating INTEGER CHECK (folding_quality_rating >= 1 AND folding_quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, customer_id)
);

-- Create referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  reward_amount_cents INTEGER NOT NULL DEFAULT 500, -- $5 default
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral uses table to track who used whose code
CREATE TABLE public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_given_cents INTEGER NOT NULL,
  order_id UUID REFERENCES public.orders(id), -- First order that used the referral
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referral_code_id, referred_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all wallets" ON public.wallets FOR ALL USING (is_admin_role(auth.uid()));

-- Wallet transaction policies
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM public.wallets WHERE id = wallet_id
  )
);
CREATE POLICY "System can create transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions FOR ALL USING (is_admin_role(auth.uid()));

-- Payment methods policies
CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);

-- Tips policies
CREATE POLICY "Users can view their own tips" ON public.tips FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = operator_id);
CREATE POLICY "Customers can create tips" ON public.tips FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all tips" ON public.tips FOR ALL USING (is_admin_role(auth.uid()));

-- Order ratings policies
CREATE POLICY "Users can manage their own ratings" ON public.order_ratings FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Admins can view all ratings" ON public.order_ratings FOR SELECT USING (is_admin_role(auth.uid()));

-- Referral codes policies
CREATE POLICY "Users can manage their own referral codes" ON public.referral_codes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active referral codes" ON public.referral_codes FOR SELECT USING (is_active = true);

-- Referral uses policies
CREATE POLICY "Users can view their referral uses" ON public.referral_uses FOR SELECT USING (
  auth.uid() = referred_user_id OR auth.uid() = referrer_user_id
);
CREATE POLICY "System can create referral uses" ON public.referral_uses FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all referral uses" ON public.referral_uses FOR ALL USING (is_admin_role(auth.uid()));

-- Add triggers for updated_at columns
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
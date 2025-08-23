-- Add tax compliance fields to profiles table (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tax_id') THEN
    ALTER TABLE public.profiles ADD COLUMN tax_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='business_name') THEN
    ALTER TABLE public.profiles ADD COLUMN business_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tax_address') THEN
    ALTER TABLE public.profiles ADD COLUMN tax_address JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='w9_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN w9_completed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='w9_file_url') THEN
    ALTER TABLE public.profiles ADD COLUMN w9_file_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='contractor_start_date') THEN
    ALTER TABLE public.profiles ADD COLUMN contractor_start_date TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_contractor') THEN
    ALTER TABLE public.profiles ADD COLUMN is_contractor BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add bank account information to washers table (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='washers' AND column_name='bank_account_info') THEN
    ALTER TABLE public.washers ADD COLUMN bank_account_info JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='washers' AND column_name='ach_verified') THEN
    ALTER TABLE public.washers ADD COLUMN ach_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Contractors can view their own tax documents" ON public.tax_documents;
DROP POLICY IF EXISTS "Owners can manage all tax documents" ON public.tax_documents;
DROP POLICY IF EXISTS "Owners can manage payout schedules" ON public.payout_schedules;

-- Create tax documents table if not exists
CREATE TABLE IF NOT EXISTS public.tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tax_year INTEGER NOT NULL,
  document_type TEXT NOT NULL DEFAULT '1099-NEC',
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,
  document_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contractor_id, tax_year, document_type)
);

-- Enable RLS on tax documents
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for tax documents
CREATE POLICY "Contractors can view their own tax documents"
ON public.tax_documents
FOR SELECT
USING (auth.uid() = contractor_id);

CREATE POLICY "Owners can manage all tax documents"
ON public.tax_documents
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create weekly payout schedules table if not exists
CREATE TABLE IF NOT EXISTS public.payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  total_contractors INTEGER DEFAULT 0,
  total_amount_cents INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(week_start_date, week_end_date)
);

-- Enable RLS on payout schedules
ALTER TABLE public.payout_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for payout schedules
CREATE POLICY "Owners can manage payout schedules"
ON public.payout_schedules
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add columns to payouts table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='payout_schedule_id') THEN
    ALTER TABLE public.payouts ADD COLUMN payout_schedule_id UUID REFERENCES public.payout_schedules(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='ach_transfer_id') THEN
    ALTER TABLE public.payouts ADD COLUMN ach_transfer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='bank_account_last4') THEN
    ALTER TABLE public.payouts ADD COLUMN bank_account_last4 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='processing_fee_cents') THEN
    ALTER TABLE public.payouts ADD COLUMN processing_fee_cents INTEGER DEFAULT 0;
  END IF;
END $$;
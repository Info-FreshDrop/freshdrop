-- Add tax compliance fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS w9_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS w9_file_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contractor_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_contractor BOOLEAN DEFAULT false;

-- Add bank account information to washers table
ALTER TABLE public.washers ADD COLUMN IF NOT EXISTS bank_account_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.washers ADD COLUMN IF NOT EXISTS ach_verified BOOLEAN DEFAULT false;

-- Create tax documents table
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

-- Create weekly payout schedules table
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

-- Add payout schedule reference to payouts table
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS payout_schedule_id UUID REFERENCES public.payout_schedules(id);

-- Update payouts table for weekly processing
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS ach_transfer_id TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS bank_account_last4 TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processing_fee_cents INTEGER DEFAULT 0;

-- Create function to generate weekly payout schedule
CREATE OR REPLACE FUNCTION public.create_weekly_payout_schedule(
  p_week_start DATE,
  p_week_end DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_id UUID;
  contractor_count INTEGER;
  total_amount INTEGER;
BEGIN
  -- Calculate totals for the week
  SELECT 
    COUNT(DISTINCT oe.operator_id),
    COALESCE(SUM(oe.total_earnings_cents), 0)
  INTO contractor_count, total_amount
  FROM operator_earnings oe
  JOIN orders o ON o.id = oe.order_id
  WHERE o.completed_at >= p_week_start 
    AND o.completed_at < p_week_end + INTERVAL '1 day'
    AND oe.status = 'pending';

  -- Create the payout schedule
  INSERT INTO public.payout_schedules (
    week_start_date,
    week_end_date,
    total_contractors,
    total_amount_cents
  ) VALUES (
    p_week_start,
    p_week_end,
    contractor_count,
    total_amount
  ) RETURNING id INTO schedule_id;

  RETURN schedule_id;
END;
$$;

-- Create function to process weekly payouts
CREATE OR REPLACE FUNCTION public.process_weekly_payouts(
  p_schedule_id UUID
)
RETURNS TABLE(
  contractor_id UUID,
  payout_id UUID,
  total_earnings_cents INTEGER,
  earnings_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  contractor_record RECORD;
  payout_id UUID;
BEGIN
  -- Get the schedule details
  SELECT * INTO schedule_record
  FROM payout_schedules
  WHERE id = p_schedule_id;

  -- Process payouts for each contractor
  FOR contractor_record IN
    SELECT 
      oe.operator_id,
      SUM(oe.total_earnings_cents) as total_earnings,
      COUNT(oe.id) as earnings_count,
      w.user_id
    FROM operator_earnings oe
    JOIN orders o ON o.id = oe.order_id
    JOIN washers w ON w.id = oe.operator_id
    JOIN profiles p ON p.user_id = w.user_id
    WHERE o.completed_at >= schedule_record.week_start_date 
      AND o.completed_at < schedule_record.week_end_date + INTERVAL '1 day'
      AND oe.status = 'pending'
      AND p.is_contractor = true
      AND w.ach_verified = true
    GROUP BY oe.operator_id, w.user_id
    HAVING SUM(oe.total_earnings_cents) > 0
  LOOP
    -- Create payout record
    INSERT INTO public.payouts (
      operator_id,
      total_amount_cents,
      payout_method,
      status,
      payout_schedule_id
    ) VALUES (
      contractor_record.operator_id,
      contractor_record.total_earnings,
      'ach_transfer',
      'processing',
      p_schedule_id
    ) RETURNING id INTO payout_id;

    -- Link earnings to payout and mark as paid
    INSERT INTO public.payout_earnings (payout_id, earning_id)
    SELECT payout_id, oe.id
    FROM operator_earnings oe
    JOIN orders o ON o.id = oe.order_id
    WHERE o.completed_at >= schedule_record.week_start_date 
      AND o.completed_at < schedule_record.week_end_date + INTERVAL '1 day'
      AND oe.status = 'pending'
      AND oe.operator_id = contractor_record.operator_id;

    -- Update earnings status to paid
    UPDATE operator_earnings
    SET status = 'paid', updated_at = now()
    WHERE id IN (
      SELECT oe.id
      FROM operator_earnings oe
      JOIN orders o ON o.id = oe.order_id
      WHERE o.completed_at >= schedule_record.week_start_date 
        AND o.completed_at < schedule_record.week_end_date + INTERVAL '1 day'
        AND oe.status = 'pending'
        AND oe.operator_id = contractor_record.operator_id
    );

    -- Return the results
    contractor_id := contractor_record.user_id;
    total_earnings_cents := contractor_record.total_earnings;
    earnings_count := contractor_record.earnings_count;
    RETURN NEXT;
  END LOOP;

  -- Update schedule status
  UPDATE payout_schedules
  SET status = 'processed', processed_at = now()
  WHERE id = p_schedule_id;

  RETURN;
END;
$$;
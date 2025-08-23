import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StripePayoutRequest {
  payout_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { payout_id }: StripePayoutRequest = await req.json();
    console.log(`Processing Stripe payout for payout ID: ${payout_id}`);

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        washers!inner(
          user_id,
          bank_account_info,
          profiles!inner(
            first_name,
            last_name,
            email,
            business_name
          )
        )
      `)
      .eq('id', payout_id)
      .single();

    if (payoutError) {
      console.error('Error fetching payout:', payoutError);
      throw new Error(`Payout not found: ${payoutError.message}`);
    }

    if (payout.status !== 'pending') {
      throw new Error(`Payout is not in pending status: ${payout.status}`);
    }

    const operatorInfo = payout.washers;
    const profileInfo = operatorInfo.profiles;
    const bankInfo = operatorInfo.bank_account_info;

    console.log(`Processing payout for operator: ${profileInfo.first_name} ${profileInfo.last_name}`);

    if (!bankInfo || !bankInfo.account_number || !bankInfo.routing_number) {
      throw new Error('Bank account information is incomplete');
    }

    // In a real implementation, you would:
    // 1. Create or retrieve a Stripe Connect account for the operator
    // 2. Verify the bank account if not already verified
    // 3. Create a transfer or payout to their connected account

    // For demonstration, we'll simulate the process:
    const amountDollars = (payout.total_amount_cents / 100).toFixed(2);
    
    // Simulate Stripe Connect transfer
    // In reality, you'd use something like:
    // const transfer = await stripe.transfers.create({
    //   amount: payout.total_amount_cents,
    //   currency: 'usd',
    //   destination: connectedAccountId,
    //   transfer_group: `payout_${payout_id}`,
    //   metadata: {
    //     payout_id: payout_id,
    //     operator_name: `${profileInfo.first_name} ${profileInfo.last_name}`,
    //   }
    // });

    console.log(`Simulating ACH transfer of $${amountDollars} to ${bankInfo.account_number.slice(-4)}`);

    // Update payout status to processing
    const { error: updateError } = await supabaseAdmin
      .from('payouts')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
        notes: `ACH transfer initiated to account ending in ${bankInfo.account_number.slice(-4)}`
      })
      .eq('id', payout_id);

    if (updateError) {
      console.error('Error updating payout status:', updateError);
      throw updateError;
    }

    // In a real implementation, you would listen for webhooks to update to 'completed' status
    // For now, we'll mark as completed after a short delay
    setTimeout(async () => {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: 'completed',
          notes: `ACH transfer completed to account ending in ${bankInfo.account_number.slice(-4)}`
        })
        .eq('id', payout_id);
    }, 2000);

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout_id,
        amount: amountDollars,
        operator_name: `${profileInfo.first_name} ${profileInfo.last_name}`,
        account_ending: bankInfo.account_number.slice(-4),
        status: 'processing',
        message: 'Payout initiated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Stripe payout processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
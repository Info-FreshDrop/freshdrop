import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyPayoutRequest {
  week_start?: string;
  week_end?: string;
  schedule_id?: string;
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

    const { week_start, week_end, schedule_id }: WeeklyPayoutRequest = await req.json();

    let scheduleId = schedule_id;

    // If creating a new schedule
    if (week_start && week_end && !schedule_id) {
      console.log(`Creating payout schedule for ${week_start} to ${week_end}`);

      // Create the payout schedule
      const { data: scheduleData, error: scheduleError } = await supabaseAdmin
        .rpc('create_weekly_payout_schedule', {
          p_week_start: week_start,
          p_week_end: week_end,
        });

      if (scheduleError) {
        console.error('Error creating payout schedule:', scheduleError);
        throw scheduleError;
      }

      scheduleId = scheduleData;
      console.log(`Created payout schedule with ID: ${scheduleId}`);
    }

    // If processing an existing schedule
    if (scheduleId) {
      console.log(`Processing payouts for schedule ID: ${scheduleId}`);

      // Process the payouts using the database function
      const { data: payoutResults, error: payoutError } = await supabaseAdmin
        .rpc('process_weekly_payouts', {
          p_schedule_id: scheduleId,
        });

      if (payoutError) {
        console.error('Error processing payouts:', payoutError);
        throw payoutError;
      }

      console.log('Payout processing results:', payoutResults);

      // In a real implementation, this is where you would integrate with
      // a payment processor like Stripe Connect or similar to initiate ACH transfers
      // For now, we'll simulate the process by updating payout status to "completed"

      if (payoutResults && payoutResults.length > 0) {
        // Update all payouts to "completed" status (simulation)
        const payoutIds = payoutResults.map((result: any) => result.payout_id);
        
        const { error: updateError } = await supabaseAdmin
          .from('payouts')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .in('id', payoutIds);

        if (updateError) {
          console.error('Error updating payout status:', updateError);
          throw updateError;
        }

        console.log(`Updated ${payoutIds.length} payouts to completed status`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          schedule_id: scheduleId,
          processed_count: payoutResults?.length || 0,
          results: payoutResults,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error('Either week dates or schedule_id must be provided');
    }

  } catch (error) {
    console.error('Weekly payout processing error:', error);
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
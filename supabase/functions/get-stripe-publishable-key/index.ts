import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    
    if (!publishableKey) {
      console.error('STRIPE_PUBLISHABLE_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Stripe publishable key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Returning Stripe publishable key (masked):', publishableKey.substring(0, 10) + '...');

    return new Response(
      JSON.stringify({ publishableKey }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error getting Stripe publishable key:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to get Stripe publishable key' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
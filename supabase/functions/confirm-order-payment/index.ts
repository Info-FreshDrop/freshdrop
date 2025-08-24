import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== CONFIRM ORDER PAYMENT FUNCTION START ===');

  try {
    // Parse request body
    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("Payment Intent ID is required");
    }

    console.log("Payment Intent ID:", paymentIntentId);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log("Payment Intent status:", paymentIntent.status);

    // Check if payment was successful
    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Payment not completed",
          status: paymentIntent.status 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get order ID from payment intent metadata
    const orderId = paymentIntent.metadata.order_id;
    const userId = paymentIntent.metadata.user_id;
    
    if (!orderId || !userId) {
      throw new Error("Order ID not found in payment intent metadata");
    }

    console.log("Order ID from metadata:", orderId);

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Update order status from pending_payment to unclaimed (ready for operator pickup)
    const { data: updatedOrder, error: updateError } = await supabaseService
      .from("orders")
        .update({ 
          status: 'unclaimed',
          updated_at: new Date().toISOString()
        })
      .eq('id', orderId)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('status', 'pending_payment') // Only update orders that are pending payment
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order status");
    }

    console.log("Order confirmed successfully:", orderId);

    // Record promo code usage if applicable
    if (updatedOrder.promo_code) {
      try {
        const { data: promoCode } = await supabaseService
          .from('promo_codes')
          .select('id')
          .eq('code', updatedOrder.promo_code)
          .single();

        if (promoCode) {
          await supabaseService
            .from('promo_code_usage')
            .insert({
              promo_code_id: promoCode.id,
              user_id: userId,
              order_id: orderId,
              discount_amount_cents: updatedOrder.discount_amount_cents || 0
            });
        }
      } catch (promoError) {
        console.error("Error recording promo code usage:", promoError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: orderId,
        message: "Payment confirmed and order is ready for pickup"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Payment confirmation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to confirm payment"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
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

  console.log('=== CONFIRM PAYMENT FUNCTION START ===');

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
    console.log("=== RETRIEVING PAYMENT INTENT ===");
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

    // Get order data from payment intent metadata
    const orderDataString = paymentIntent.metadata.order_data;
    const userId = paymentIntent.metadata.user_id;
    
    if (!orderDataString || !userId) {
      throw new Error("Order data not found in payment intent metadata");
    }

    const orderData = JSON.parse(orderDataString);
    console.log("Order data retrieved from metadata:", JSON.stringify(orderData, null, 2));

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if order already exists for this payment intent
    const { data: existingOrder } = await supabaseService
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (existingOrder) {
      console.log("Order already exists for this payment intent:", existingOrder.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: existingOrder.id,
          message: "Order already processed"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create order record in database
    console.log("=== CREATING ORDER RECORD ===");
    const orderRecord = {
      customer_id: userId,
      pickup_type: orderData.pickup_type,
      service_type: orderData.service_type,
      pickup_address: orderData.pickup_address,
      delivery_address: orderData.delivery_address,
      zip_code: orderData.zip_code,
      is_express: orderData.is_express || false,
      pickup_window_start: orderData.pickup_window_start,
      pickup_window_end: orderData.pickup_window_end,
      delivery_window_start: orderData.delivery_window_start,
      delivery_window_end: orderData.delivery_window_end,
      bag_count: orderData.bag_count || 1,
      soap_preference_id: orderData.soap_preference_id,
      wash_temp_preference_id: orderData.wash_temp_preference_id,
      dry_temp_preference_id: orderData.dry_temp_preference_id,
      special_instructions: orderData.special_instructions || "",
      items: orderData.items || [],
      status: "unclaimed", // Order is paid and ready for operators
      stripe_payment_intent_id: paymentIntentId,
      promo_code: orderData.promoCode,
      discount_amount_cents: orderData.discount_amount_cents || 0,
      total_amount_cents: orderData.total_amount_cents,
      created_at: new Date().toISOString(),
    };

    console.log("Creating order with data:", JSON.stringify(orderRecord, null, 2));

    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .insert(orderRecord)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("Order created successfully:", order.id);

    // Record promo code usage if applicable
    if (orderData.promoCode && orderData.discount_amount_cents > 0) {
      console.log("=== RECORDING PROMO CODE USAGE ===");
      
      // Get promo code details
      const { data: promoCode } = await supabaseService
        .from("promo_codes")
        .select("id")
        .eq("code", orderData.promoCode.toUpperCase())
        .single();

      if (promoCode) {
        await supabaseService
          .from("promo_code_usage")
          .insert({
            user_id: userId,
            promo_code_id: promoCode.id,
            order_id: order.id,
            used_at: new Date().toISOString(),
          });
        console.log("Promo code usage recorded");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        message: "Order created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`Payment confirmation error [${errorId}]:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Payment confirmation failed",
        errorId: errorId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
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

    // Get metadata from payment intent
    const orderId = paymentIntent.metadata.order_id;
    const userId = paymentIntent.metadata.user_id;
    const orderDataStr = paymentIntent.metadata.order_data;
    
    console.log("Payment Intent metadata:", { orderId, userId, hasOrderData: !!orderDataStr });

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let finalOrderId = orderId;

    // If no order exists (new flow), create it now after payment confirmation
    if (!orderId && orderDataStr && userId) {
      console.log("Creating order after payment confirmation (new secure flow)");
      
      const orderData = JSON.parse(orderDataStr);
      
      // Create the order record
      const orderRecord = {
        customer_id: userId,
        pickup_type: orderData.pickup_type,
        service_type: orderData.service_type,
        pickup_address: orderData.pickup_address,
        delivery_address: orderData.delivery_address,
        zip_code: orderData.zip_code,
        is_express: orderData.is_express,
        pickup_window_start: orderData.pickup_window_start,
        pickup_window_end: orderData.pickup_window_end,
        delivery_window_start: orderData.delivery_window_start,
        delivery_window_end: orderData.delivery_window_end,
        bag_count: orderData.bag_count,
        soap_preference_id: orderData.soap_preference_id,
        wash_temp_preference_id: orderData.wash_temp_preference_id,
        dry_temp_preference_id: orderData.dry_temp_preference_id,
        special_instructions: orderData.special_instructions,
        items: orderData.items,
        status: 'unclaimed',
        promo_code: orderData.promoCode,
        discount_amount_cents: orderData.discount_amount_cents || 0,
        total_amount_cents: paymentIntent.amount,
        stripe_payment_intent_id: paymentIntentId,
        created_at: new Date().toISOString(),
      };

      const { data: newOrder, error: createError } = await supabaseService
        .from("orders")
        .insert(orderRecord)
        .select()
        .single();

      if (createError) {
        console.error("Error creating order after payment:", createError);
        throw new Error("Failed to create order after payment confirmation");
      }

      finalOrderId = newOrder.id;
      console.log("Order created successfully after payment:", finalOrderId);

      // Record promo code usage if applicable
      if (orderData.promoCode) {
        try {
          const { data: promoCode } = await supabaseService
            .from('promo_codes')
            .select('id')
            .eq('code', orderData.promoCode)
            .single();

          if (promoCode) {
            await supabaseService
              .from('promo_code_usage')
              .insert({
                promo_code_id: promoCode.id,
                user_id: userId,
                order_id: finalOrderId,
                discount_amount_cents: orderData.discount_amount_cents || 0
              });
          }
        } catch (promoError) {
          console.error("Error recording promo code usage:", promoError);
        }
      }

    } else if (orderId) {
      // Existing flow - update existing order
      console.log("Updating existing order status:", orderId);
      
      const { data: updatedOrder, error: updateError } = await supabaseService
        .from("orders")
        .update({ 
          status: 'unclaimed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('stripe_payment_intent_id', paymentIntentId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw new Error("Failed to update order status");
      }

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
    } else {
      throw new Error("No order ID or order data found in payment intent metadata");
    }

    console.log("Order confirmed successfully:", finalOrderId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: finalOrderId,
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
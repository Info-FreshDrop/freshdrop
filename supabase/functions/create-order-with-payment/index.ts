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

  console.log('=== CREATE ORDER WITH PAYMENT FUNCTION START ===');

  // Create Supabase client for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("User authenticated:", user.email);

    // Parse request body
    const { orderData } = await req.json();
    console.log("Order data received:", JSON.stringify(orderData, null, 2));

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log("Stripe initialized successfully");

    // Create Supabase service client for order creation
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle referral cash usage if applicable
    if (orderData.referral_cash_used && orderData.referral_cash_used > 0) {
      console.log("Processing referral cash usage:", orderData.referral_cash_used);
      
      // Record referral cash usage by creating a negative transaction
      const { error: referralError } = await supabaseService
        .from('referral_uses')
        .insert({
          referrer_user_id: user.id,
          referred_user_id: user.id, // Same user for cash usage
          referral_code_id: '00000000-0000-0000-0000-000000000000', // Placeholder for cash usage
          reward_given_cents: -orderData.referral_cash_used, // Negative to deduct
          order_id: null // Will update with order id after creation
        });
        
      if (referralError) {
        console.error("Error recording referral cash usage:", referralError);
        throw new Error("Failed to apply referral cash");
      }
    }

    // Create the order first
    const orderRecord = {
      customer_id: user.id,
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
      status: orderData.total_amount_cents === 0 ? 'placed' : 'pending_payment', // Free orders go to 'placed', paid orders wait for payment
      promo_code: orderData.promoCode,
      discount_amount_cents: (orderData.discount_amount_cents || 0) + (orderData.referral_cash_used || 0),
      total_amount_cents: orderData.total_amount_cents,
      created_at: new Date().toISOString(),
    };

    console.log("Creating order record:", JSON.stringify(orderRecord, null, 2));

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

    // Update referral cash usage record with order ID if applicable
    if (orderData.referral_cash_used && orderData.referral_cash_used > 0) {
      await supabaseService
        .from('referral_uses')
        .update({ order_id: order.id })
        .eq('referrer_user_id', user.id)
        .eq('reward_given_cents', -orderData.referral_cash_used)
        .is('order_id', null);
    }

    // If total is 0, update status to unclaimed and return success
    if (orderData.total_amount_cents === 0) {
      console.log("Processing $0 order - skipping Stripe payment");

      const { error: updateError } = await supabaseService
        .from("orders")
        .update({ status: 'unclaimed' })
        .eq('id', order.id);

      if (updateError) {
        console.error("Error updating $0 order status:", updateError);
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

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
                user_id: user.id,
                order_id: order.id,
                discount_amount_cents: orderData.discount_amount_cents || 0
              });
          }
        } catch (promoError) {
          console.error("Error recording promo code usage:", promoError);
        }
      }

      console.log("$0 order created successfully:", order.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: order.id,
          message: 'Order placed successfully - no payment required',
          isFreeOrder: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For paid orders, create payment intent
    console.log('=== CHECKING STRIPE CUSTOMER ===');
    
    let customerId;
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Customer ID:", customerId);
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id
          }
        });
        customerId = customer.id;
        console.log("New customer created:", customerId);
      }
    } catch (customerError) {
      console.error("Error handling Stripe customer:", customerError);
      throw new Error("Failed to create or retrieve Stripe customer");
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: orderData.total_amount_cents,
      currency: "usd",
      customer: customerId,
      metadata: {
        order_id: order.id,
        user_id: user.id
      },
    });

    // Update order with payment intent ID
    await supabaseService
      .from("orders")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id);

    console.log("Payment Intent created:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to create order or payment intent"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
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

  console.log('=== CREATE PAYMENT INTENT FUNCTION START ===');

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
    console.log("Stripe secret key found, length:", stripeKey.length);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    console.log("Stripe initialized successfully");

    // Check if customer exists
    console.log("=== CHECKING STRIPE CUSTOMER ===");
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Customer ID:", customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("Created new customer ID:", customerId);
    }

    const totalAmount = orderData.total_amount_cents;
    console.log('Order total amount:', totalAmount);

    // Handle $0 orders (due to 100% discount) - skip Stripe and create order directly
    if (totalAmount === 0) {
      console.log('Processing $0 order - skipping Stripe payment');
      
      // Create order directly in database for $0 orders
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const orderRecord = {
        customer_id: user.id,
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
        status: "unclaimed", // Set directly to unclaimed since no payment needed
        stripe_payment_intent_id: null, // No payment intent for $0 orders
        promo_code: orderData.promoCode,
        discount_amount_cents: orderData.discount_amount_cents || 0,
        total_amount_cents: 0,
        created_at: new Date().toISOString(),
      };

      console.log("Creating $0 order with data:", JSON.stringify(orderRecord, null, 2));

      const { data: order, error: orderError } = await supabaseService
        .from("orders")
        .insert(orderRecord)
        .select()
        .single();

      if (orderError) {
        console.error("Error creating $0 order:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
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

    // Continue with regular Stripe payment for orders > $0
    console.log('Processing paid order through Stripe');

    // Create Payment Intent with order data in metadata (don't create order yet)
    console.log("=== CREATING PAYMENT INTENT ===");
    
    // Store order data as JSON in metadata for later retrieval
    const orderMetadata = {
      user_id: user.id,
      order_data: JSON.stringify(orderData)
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      customer: customerId,
      metadata: orderMetadata,
    });

    console.log("Payment Intent created:", paymentIntent.id);
    console.log("Order data stored in payment intent metadata for processing after payment");

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    // Secure error logging - don't expose stack traces to client
    const errorId = crypto.randomUUID();
    console.error(`Payment intent creation error [${errorId}]:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: "Payment processing failed",
        errorId: errorId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
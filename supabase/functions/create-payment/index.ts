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

  try {
    console.log("=== CREATE PAYMENT FUNCTION START ===");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    console.log("User authenticated:", user.email);

    // Parse request body
    const requestBody = await req.json();
    console.log("Full request body:", JSON.stringify(requestBody));
    
    const { orderData } = requestBody;
    if (!orderData) {
      console.error("orderData is missing from request body");
      throw new Error("Order data is required");
    }
    console.log("Order data received:", JSON.stringify(orderData));

    // Calculate total amount for record keeping
    const bagCost = orderData.bag_count * 3500; // $35 per bag
    const expressCost = orderData.is_express ? 2000 : 0; // $20 express fee
    const fragranceFreeCost = orderData.fragranceFree ? 300 : 0; // $3 fragrance-free
    const shirtsOnHangersCost = orderData.shirtsOnHangers ? 800 : 0; // $8 shirts on hangers
    const extraRinseCost = orderData.extraRinse ? 200 : 0; // $2 extra rinse
    
    let totalAmount = bagCost + expressCost + fragranceFreeCost + shirtsOnHangersCost + extraRinseCost;
    let discountAmount = 0;
    
    // Create Supabase service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Apply promo code discount
    if (orderData.promoCode) {
      console.log("Processing promo code:", orderData.promoCode);
      
      // Get promo code details
      const { data: promoCode, error: promoError } = await supabaseService
        .from('promo_codes')
        .select('*')
        .eq('code', orderData.promoCode)
        .eq('is_active', true)
        .single();

      if (!promoError && promoCode) {
        console.log("Found promo code:", promoCode);
        
        // Check if it's a one-time use and user hasn't used it
        if (promoCode.one_time_use_per_user) {
          const { data: existingUsage } = await supabaseService
            .from('promo_code_usage')
            .select('id')
            .eq('promo_code_id', promoCode.id)
            .eq('user_id', user.id)
            .single();

          if (existingUsage) {
            console.log("Promo code already used by user");
          } else {
            // Apply discount
            if (promoCode.discount_type === 'percentage') {
              discountAmount = totalAmount * (promoCode.discount_value / 100);
            } else if (promoCode.discount_type === 'fixed') {
              discountAmount = promoCode.discount_value * 100; // Convert dollars to cents
            }
            totalAmount = Math.max(0, totalAmount - discountAmount);
            console.log("Applied discount:", discountAmount, "New total:", totalAmount);
            
            // Record promo code usage
            await supabaseService.from('promo_code_usage').insert({
              promo_code_id: promoCode.id,
              user_id: user.id,
              used_at: new Date().toISOString()
            });
          }
        } else {
          // Apply discount for non-one-time codes
          if (promoCode.discount_type === 'percentage') {
            discountAmount = totalAmount * (promoCode.discount_value / 100);
          } else if (promoCode.discount_type === 'fixed') {
            discountAmount = promoCode.discount_value * 100; // Convert dollars to cents
          }
          totalAmount = Math.max(0, totalAmount - discountAmount);
          console.log("Applied discount:", discountAmount, "New total:", totalAmount);
        }
      } else {
        console.log("Promo code not found or inactive");
      }
    }

    // Check for unused referral rewards and apply if this is first order
    const { data: existingOrders } = await supabaseService
      .from('orders')
      .select('id')
      .eq('customer_id', user.id)
      .limit(1);

    console.log("Checking referral discount for user:", user.id, "Existing orders:", existingOrders?.length || 0);

    if (!existingOrders || existingOrders.length === 0) {
      // This is the user's first order, check for referral rewards
      const { data: referralReward, error: referralError } = await supabaseService
        .from('referral_uses')
        .select('reward_given_cents')
        .eq('referred_user_id', user.id)
        .single();

      console.log("Referral reward query result:", referralReward, "Error:", referralError);

      if (referralReward && referralReward.reward_given_cents > 0) {
        const referralDiscount = referralReward.reward_given_cents;
        discountAmount += referralDiscount;
        totalAmount = Math.max(0, totalAmount - referralDiscount);
        console.log("Applied referral discount:", referralDiscount, "New total:", totalAmount);
      } else {
        console.log("No referral reward found for user");
      }
    } else {
      console.log("User has existing orders, no referral discount applied");
    }

    console.log("=== INITIALIZING STRIPE ===");
    // Check if Stripe secret key is configured
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey || stripeSecretKey.trim() === "") {
      console.error("STRIPE_SECRET_KEY is not configured");
      throw new Error("Payment system not configured. Please contact support.");
    }
    console.log("Stripe secret key found, length:", stripeSecretKey.length);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    console.log("Stripe initialized successfully");

    console.log("=== CHECKING STRIPE CUSTOMER ===");
    // Check if a Stripe customer already exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
    }
    console.log("Customer ID:", customerId);

    console.log("=== CREATING ORDER RECORD ===");
    // Create pending order first to get order ID for metadata
    const orderRecord = {
      customer_id: user.id,
      pickup_type: orderData.pickup_type,
      service_type: orderData.service_type,
      pickup_address: orderData.pickup_address,
      delivery_address: orderData.delivery_address,
      zip_code: orderData.zip_code,
      locker_id: orderData.locker_id,
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
      items: orderData.items || [],
      status: 'pending', // Will be updated to 'unclaimed' after payment
      stripe_session_id: null, // Will be updated after session creation
      promo_code: orderData.promoCode || null,
      discount_amount_cents: discountAmount,
      total_amount_cents: totalAmount,
      created_at: new Date().toISOString()
    };

    console.log("About to insert order with data:", JSON.stringify(orderRecord, null, 2));
    const { data: order, error: orderError } = await supabaseService.from("orders").insert(orderRecord).select().single();

    if (orderError) {
      console.error("Error storing order:", JSON.stringify(orderError, null, 2));
      console.error("Order record that failed:", JSON.stringify(orderRecord, null, 2));
      throw new Error(`Failed to store order data: ${orderError.message || orderError.hint || 'Unknown database error'}`);
    }

    console.log("Order created successfully:", order.id);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `FreshDrop Laundry Service - ${orderData.bag_count} bag${orderData.bag_count > 1 ? 's' : ''}`,
              description: `${orderData.is_express ? 'Express ' : ''}laundry service${orderData.special_instructions ? ': ' + orderData.special_instructions : ''}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/?payment=cancelled`,
      metadata: {
        order_id: order.id,
        user_id: user.id
      }
    });

    // Update order with Stripe session ID
    await supabaseService
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    console.log("Stripe session created:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
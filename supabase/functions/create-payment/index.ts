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
    console.log("Create payment function started");

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
    const { orderData } = await req.json();
    if (!orderData) throw new Error("Order data is required");
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

    console.log("Bypassing Stripe payment - creating order directly");

    const { data: order, error: orderError } = await supabaseService.from("orders").insert({
      ...orderData,
      customer_id: user.id,
      status: 'unclaimed', // Mark as unclaimed so operators can see it
      stripe_session_id: null, // No Stripe session
      promo_code: orderData.promoCode || null, // Map promoCode to promo_code
      discount_amount_cents: discountAmount,
      total_amount_cents: totalAmount,
      created_at: new Date().toISOString(),
      // Remove promoCode from orderData to avoid column mismatch
      promoCode: undefined
    }).select().single();

    if (orderError) {
      console.error("Error storing order:", orderError);
      throw new Error("Failed to store order data");
    }

    console.log("Order created successfully:", order.id);

    // Return success URL directly
    return new Response(JSON.stringify({ 
      url: `${req.headers.get("origin")}/payment-success?test_order=true&order_id=${order.id}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
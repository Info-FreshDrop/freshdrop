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
    
    // Apply promo code discount
    if (orderData.promoCode) {
      if (orderData.promoCode === 'TEST') {
        discountAmount = totalAmount;
        totalAmount = 0;
      }
    }

    console.log("Bypassing Stripe payment - creating order directly");
    
    // Store order directly in database (bypassing Stripe for testing)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseService.from("orders").insert({
      ...orderData,
      customer_id: user.id,
      status: 'unclaimed', // Mark as unclaimed so operators can see it
      stripe_session_id: null, // No Stripe session
      promo_code: orderData.promoCode || null,
      discount_amount_cents: discountAmount,
      total_amount_cents: totalAmount,
      created_at: new Date().toISOString()
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
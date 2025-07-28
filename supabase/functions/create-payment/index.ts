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

    // Parse request body
    const { orderData } = await req.json();
    if (!orderData) throw new Error("Order data is required");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate total amount from order data including add-ons
    const bagCost = orderData.bag_count * 3500; // $35 per bag
    const expressCost = orderData.is_express ? 2000 : 0; // $20 express fee
    const fragranceFreeCost = orderData.fragranceFree ? 300 : 0; // $3 fragrance-free
    const shirtsOnHangersCost = orderData.shirtsOnHangers ? 800 : 0; // $8 shirts on hangers
    const extraRinseCost = orderData.extraRinse ? 200 : 0; // $2 extra rinse
    
    let totalAmount = bagCost + expressCost + fragranceFreeCost + shirtsOnHangersCost + extraRinseCost;
    let discountAmount = 0;
    
    // Apply promo code discount
    if (orderData.promoCode) {
      // For now, only handle the TEST promo code (100% off)
      if (orderData.promoCode === 'TEST') {
        discountAmount = totalAmount;
        totalAmount = 0;
      }
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `FreshDrop Laundry Service`,
              description: `${orderData.bag_count} bag(s) - ${orderData.pickup_type === 'locker' ? 'Locker Service' : 'Pickup & Delivery'}${orderData.is_express ? ' (Express)' : ''}`
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        user_id: user.id,
        bag_count: orderData.bag_count.toString(),
        service_type: orderData.service_type,
        pickup_type: orderData.pickup_type
      }
    });

    // Store pending order in database with payment session ID
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: orderError } = await supabaseService.from("orders").insert({
      ...orderData,
      customer_id: user.id,
      status: 'payment_pending',
      stripe_session_id: session.id,
      promo_code: orderData.promoCode || null,
      discount_amount_cents: discountAmount,
      created_at: new Date().toISOString()
    });

    if (orderError) {
      console.error("Error storing order:", orderError);
      throw new Error("Failed to store order data");
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
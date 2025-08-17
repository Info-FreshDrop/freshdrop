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
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID is required");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("Session retrieved:", session.id, "Payment status:", session.payment_status);
    
    if (session.payment_status === 'paid') {
      // Initialize Supabase with service role key for database operations
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Check if this is a shop order from metadata
      const orderType = session.metadata?.order_type;
      console.log("Order type:", orderType);

      if (orderType === 'shop') {
        // Create shop order after payment confirmation
        const cartItems = JSON.parse(session.metadata?.cart_items || '[]');
        const userId = session.metadata?.user_id;
        
        if (!userId || !cartItems.length) {
          throw new Error("Invalid shop order metadata");
        }

        // Get default laundry preferences for shop orders
        const { data: defaultPrefs } = await supabaseService
          .from('laundry_preferences')
          .select('*')
          .eq('is_default', true)
          .eq('is_active', true);

        const soapPref = defaultPrefs?.find(p => p.category === 'soap');
        const washTempPref = defaultPrefs?.find(p => p.category === 'wash_temp');
        const dryTempPref = defaultPrefs?.find(p => p.category === 'dry_temp');

        // Create the order
        const { data: orderData, error: orderError } = await supabaseService
          .from("orders")
          .insert({
            customer_id: userId,
            pickup_type: 'pickup_delivery',
            service_type: 'wash_fold',
            zip_code: '65804', // Default - should be from user profile
            is_express: false,
            pickup_address: '123 Main St, Springfield, MO 65804', // Default - should be from user profile
            delivery_address: '123 Main St, Springfield, MO 65804', // Default - should be from user profile
            special_instructions: 'Shop items only - no regular laundry',
            bag_count: 0,
            items: [{ shop_items: cartItems }],
            total_amount_cents: session.amount_total,
            discount_amount_cents: 0,
            soap_preference_id: soapPref?.id,
            wash_temp_preference_id: washTempPref?.id,
            dry_temp_preference_id: dryTempPref?.id,
            pickup_window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            pickup_window_end: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            delivery_window_start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            delivery_window_end: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
            status: 'unclaimed',
            stripe_session_id: session_id,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating shop order:", orderError);
          throw new Error("Failed to create shop order");
        }

        console.log("Shop order created successfully:", orderData.id);
      } else {
        // Handle regular laundry orders (existing logic)
        const { error } = await supabaseService
          .from("orders")
          .update({ 
            status: 'unclaimed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_session_id', session_id);

        if (error) {
          console.error("Error updating order:", error);
          throw new Error("Failed to update order status");
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        payment_status: 'paid',
        order_confirmed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      payment_status: session.payment_status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
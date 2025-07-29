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
    console.log("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verify webhook signature
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!endpointSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    console.log("Processing event:", event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        if (session.payment_status === 'paid' && session.metadata?.order_id) {
          // Update order status to unclaimed so operators can see it
          const { error } = await supabaseService
            .from("orders")
            .update({ 
              status: 'unclaimed',
              updated_at: new Date().toISOString()
            })
            .eq('id', session.metadata.order_id);

          if (error) {
            console.error("Error updating order status:", error);
          } else {
            console.log("Order status updated to unclaimed:", session.metadata.order_id);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);

        // Find and update the order status
        const { data: orders } = await supabaseService
          .from("orders")
          .select("id")
          .eq('stripe_session_id', paymentIntent.metadata?.session_id || '');

        if (orders && orders.length > 0) {
          await supabaseService
            .from("orders")
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', orders[0].id);
          
          console.log("Order status updated to failed:", orders[0].id);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get customer details
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        const isActive = subscription.status === 'active';
        const subscriptionTier = getSubscriptionTier(subscription);

        // Update or create subscriber record
        await supabaseService
          .from("subscribers")
          .upsert({
            email: customer.email,
            user_id: customer.metadata?.user_id || null,
            stripe_customer_id: customerId,
            subscribed: isActive,
            subscription_tier: subscriptionTier,
            subscription_end: subscription.current_period_end ? 
              new Date(subscription.current_period_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        console.log("Subscriber updated:", customer.email, "Active:", isActive);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        // Mark subscription as inactive
        await supabaseService
          .from("subscribers")
          .upsert({
            email: customer.email,
            user_id: customer.metadata?.user_id || null,
            stripe_customer_id: customerId,
            subscribed: false,
            subscription_tier: null,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        console.log("Subscription cancelled:", customer.email);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function getSubscriptionTier(subscription: Stripe.Subscription): string {
  // Determine subscription tier based on price
  const price = subscription.items.data[0]?.price;
  if (!price?.unit_amount) return "Basic";
  
  const amount = price.unit_amount;
  if (amount <= 999) return "Basic";
  if (amount <= 1999) return "Premium";
  return "Enterprise";
}
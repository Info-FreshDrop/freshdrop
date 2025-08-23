import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  id: string;
  washer_id: string;
  total_amount_cents: number;
  status: string;
}

interface TipData {
  amount_cents: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Calculating earnings for order: ${order_id}`);

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, washer_id, total_amount_cents, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only calculate earnings for completed orders
    if (order.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Order is not completed yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order.washer_id) {
      return new Response(
        JSON.stringify({ error: "Order has no assigned operator" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if earnings already calculated for this order
    const { data: existingEarnings } = await supabaseAdmin
      .from("operator_earnings")
      .select("id")
      .eq("order_id", order_id)
      .single();

    if (existingEarnings) {
      console.log(`Earnings already calculated for order ${order_id}`);
      return new Response(
        JSON.stringify({ message: "Earnings already calculated", earnings_id: existingEarnings.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get revenue split settings (default to 50/50)
    const { data: revenueSplitSettings } = await supabaseAdmin
      .from("business_settings")
      .select("setting_value")
      .eq("setting_key", "revenue_split")
      .single();

    let operatorPercentage = 50; // Default 50%
    if (revenueSplitSettings?.setting_value) {
      operatorPercentage = revenueSplitSettings.setting_value.operator_percentage || 50;
    }

    // Calculate revenue share
    const revenueShareCents = Math.floor((order.total_amount_cents * operatorPercentage) / 100);

    // Get tips for this order
    const { data: tips } = await supabaseAdmin
      .from("tips")
      .select("amount_cents")
      .eq("order_id", order_id);

    const totalTipsCents = tips?.reduce((sum, tip) => sum + tip.amount_cents, 0) || 0;

    // Calculate total earnings
    const totalEarningsCents = revenueShareCents + totalTipsCents;

    // Insert earnings record
    const { data: earnings, error: earningsError } = await supabaseAdmin
      .from("operator_earnings")
      .insert({
        operator_id: order.washer_id,
        order_id: order.id,
        revenue_share_cents: revenueShareCents,
        tips_cents: totalTipsCents,
        total_earnings_cents: totalEarningsCents,
        status: "pending"
      })
      .select()
      .single();

    if (earningsError) {
      console.error("Error creating earnings record:", earningsError);
      return new Response(
        JSON.stringify({ error: "Failed to calculate earnings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Earnings calculated for operator ${order.washer_id}: $${totalEarningsCents / 100}`);

    return new Response(
      JSON.stringify({
        message: "Earnings calculated successfully",
        earnings: {
          id: earnings.id,
          revenue_share_cents: revenueShareCents,
          tips_cents: totalTipsCents,
          total_earnings_cents: totalEarningsCents
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in calculate-operator-earnings:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
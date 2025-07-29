import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelOrderRequest {
  orderId: string;
  reason?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, reason }: CancelOrderRequest = await req.json();
    
    console.log('Cancelling order:', orderId, 'reason:', reason);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['placed', 'unclaimed', 'claimed'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Process refund if payment was made
    let refundResult = null;
    if (order.stripe_payment_intent_id && order.total_amount_cents > 0) {
      try {
        const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            payment_intent: order.stripe_payment_intent_id,
            amount: order.total_amount_cents.toString(),
            reason: 'requested_by_customer',
          }),
        });

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json();
          console.error('Stripe refund failed:', errorData);
          throw new Error(`Refund failed: ${errorData.error?.message || 'Unknown error'}`);
        }

        refundResult = await refundResponse.json();
        console.log('Refund successful:', refundResult.id);
      } catch (refundError) {
        console.error('Refund processing error:', refundError);
        // Don't fail the cancellation if refund fails - log and continue
        refundResult = { error: refundError.message };
      }
    }

    // Update order status to cancelled
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        special_instructions: order.special_instructions + 
          (reason ? `\n\nCancellation reason: ${reason}` : '\n\nCancelled by customer'),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Send notification about cancellation
    try {
      await supabase.functions.invoke('send-order-notifications', {
        body: {
          orderId: order.id,
          customerId: order.customer_id,
          status: 'cancelled',
          orderNumber: order.id.substring(0, 8).toUpperCase()
        }
      });
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        orderId: orderId,
        refund: refundResult ? {
          processed: !refundResult.error,
          refundId: refundResult.id,
          amount: refundResult.amount,
          error: refundResult.error
        } : null,
        message: 'Order cancelled successfully' + (refundResult?.id ? ' and refund processed' : '')
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
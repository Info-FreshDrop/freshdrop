import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running behavioral trigger checks...');

    await Promise.all([
      checkInactivityTriggers(),
      checkPostOrderTriggers(),
      checkMilestoneTriggers(),
      checkAbandonedCartTriggers()
    ]);

    return new Response(JSON.stringify({ success: true, message: 'Behavioral triggers processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in behavioral triggers:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function checkInactivityTriggers() {
  console.log('Checking inactivity triggers...');
  
  // Get all active inactivity triggers
  const { data: triggers } = await supabase
    .from('campaign_triggers')
    .select(`
      *,
      campaign:marketing_campaigns(*)
    `)
    .eq('trigger_type', 'inactivity')
    .eq('is_active', true);

  if (!triggers) return;

  for (const trigger of triggers) {
    const conditions = trigger.conditions as any;
    const inactiveDays = conditions.inactiveDays || 14;
    
    // Find customers who haven't ordered in specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
    
    const { data: inactiveCustomers } = await supabase
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name
      `)
      .not('user_id', 'in', `(
        SELECT DISTINCT customer_id 
        FROM orders 
        WHERE created_at > '${cutoffDate.toISOString()}'
      )`);

    if (inactiveCustomers && inactiveCustomers.length > 0) {
      console.log(`Found ${inactiveCustomers.length} inactive customers for trigger ${trigger.id}`);
      
      // Check if we've already sent this campaign to these customers recently
      for (const customer of inactiveCustomers) {
        const recentlySent = await wasRecentlySent(customer.user_id, trigger.campaign.id, 7); // Don't send again within 7 days
        
        if (!recentlySent) {
          await triggerMarketingCampaign(trigger.campaign.id, customer.user_id, trigger.delay_minutes);
        }
      }
    }
  }
}

async function checkPostOrderTriggers() {
  console.log('Checking post-order triggers...');
  
  const { data: triggers } = await supabase
    .from('campaign_triggers')
    .select(`
      *,
      campaign:marketing_campaigns(*)
    `)
    .eq('trigger_type', 'post_order')
    .eq('is_active', true);

  if (!triggers) return;

  for (const trigger of triggers) {
    const conditions = trigger.conditions as any;
    const hoursAfterDelivery = conditions.hoursAfterDelivery || 2;
    
    // Find completed orders from specified hours ago
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() - hoursAfterDelivery);
    
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('id, customer_id, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', targetTime.toISOString())
      .lte('completed_at', new Date(targetTime.getTime() + 60 * 60 * 1000).toISOString()); // 1 hour window
    
    if (completedOrders && completedOrders.length > 0) {
      console.log(`Found ${completedOrders.length} completed orders for post-order trigger ${trigger.id}`);
      
      for (const order of completedOrders) {
        const recentlySent = await wasRecentlySent(order.customer_id, trigger.campaign.id, 1); // Don't send again within 1 day
        
        if (!recentlySent) {
          await triggerMarketingCampaign(trigger.campaign.id, order.customer_id, trigger.delay_minutes);
        }
      }
    }
  }
}

async function checkMilestoneTriggers() {
  console.log('Checking milestone triggers...');
  
  const { data: triggers } = await supabase
    .from('campaign_triggers')
    .select(`
      *,
      campaign:marketing_campaigns(*)
    `)
    .eq('trigger_type', 'milestone')
    .eq('is_active', true);

  if (!triggers) return;

  for (const trigger of triggers) {
    const conditions = trigger.conditions as any;
    const orderCount = conditions.orderCount || 5;
    
    // Find customers who just reached the milestone
    const { data: customers } = await supabase
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        orders:orders(count)
      `)
      .eq('orders.count', orderCount);

    if (customers && customers.length > 0) {
      console.log(`Found ${customers.length} customers reaching milestone for trigger ${trigger.id}`);
      
      for (const customer of customers) {
        const recentlySent = await wasRecentlySent(customer.user_id, trigger.campaign.id, 30); // Don't send again within 30 days
        
        if (!recentlySent) {
          await triggerMarketingCampaign(trigger.campaign.id, customer.user_id, trigger.delay_minutes);
        }
      }
    }
  }
}

async function checkAbandonedCartTriggers() {
  console.log('Checking abandoned cart triggers...');
  
  // This would check for incomplete orders or sessions
  // For now, we'll implement a basic version
  const { data: triggers } = await supabase
    .from('campaign_triggers')
    .select(`
      *,
      campaign:marketing_campaigns(*)
    `)
    .eq('trigger_type', 'abandoned_cart')
    .eq('is_active', true);

  if (!triggers) return;

  // Implementation would depend on how abandoned carts are tracked
  // This is a placeholder for the logic
  console.log('Abandoned cart triggers checked (placeholder implementation)');
}

async function wasRecentlySent(customerId: string, campaignId: string, withinDays: number): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);
  
  const { data } = await supabase
    .from('notification_delivery_log')
    .select('id')
    .eq('customer_id', customerId)
    .eq('campaign_id', campaignId)
    .gte('sent_at', cutoffDate.toISOString())
    .limit(1);
  
  return (data && data.length > 0) || false;
}

async function triggerMarketingCampaign(campaignId: string, customerId: string, delayMinutes: number = 0) {
  console.log(`Triggering campaign ${campaignId} for customer ${customerId} with ${delayMinutes}min delay`);
  
  // Call marketing automation function
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/marketing-automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        campaignId,
        triggerType: 'behavioral',
        customerId,
        delay: delayMinutes
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger campaign: ${response.statusText}`);
    }
    
    console.log(`Successfully triggered campaign ${campaignId} for customer ${customerId}`);
  } catch (error) {
    console.error(`Failed to trigger campaign ${campaignId}:`, error);
  }
}

serve(handler);
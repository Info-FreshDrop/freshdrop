import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  campaignId: string;
  triggerType?: 'scheduled' | 'behavioral';
  customerId?: string;
  delay?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, triggerType = 'scheduled', customerId, delay = 0 }: NotificationRequest = await req.json();
    
    console.log(`Processing marketing automation for campaign: ${campaignId}, type: ${triggerType}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        template:notification_templates(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    if (campaign.status !== 'active') {
      console.log(`Campaign ${campaignId} is not active, skipping`);
      return new Response(JSON.stringify({ message: 'Campaign not active' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let targetCustomers = [];

    if (customerId) {
      // Single customer trigger (behavioral)
      const { data: customer } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('user_id', customerId)
        .single();
      
      if (customer) {
        const { data: authUser } = await supabase.auth.admin.getUserById(customerId);
        if (authUser.user) {
          targetCustomers = [{
            ...customer,
            email: authUser.user.email
          }];
        }
      }
    } else {
      // Get target customers based on segment
      if (campaign.target_segment) {
        const segmentConditions = await getSegmentConditions(campaign.target_segment);
        targetCustomers = await getCustomersFromSegment(segmentConditions);
      } else {
        // Default to all active customers
        const { data: customers } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name');
        
        if (customers) {
          const customerEmails = await Promise.all(
            customers.map(async (customer) => {
              const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
              return authUser.user ? {
                ...customer,
                email: authUser.user.email
              } : null;
            })
          );
          targetCustomers = customerEmails.filter(Boolean);
        }
      }
    }

    console.log(`Sending to ${targetCustomers.length} customers`);

    // Send notifications to all target customers
    const sendPromises = targetCustomers.map(async (customer) => {
      try {
        // Apply delay if specified
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * 60 * 1000));
        }

        // Personalize message
        const personalizedSubject = personalizeMessage(campaign.template.subject, customer);
        const personalizedMessage = personalizeMessage(campaign.template.message, customer);

        // Send email notification
        const emailResult = await resend.emails.send({
          from: 'FreshDrop <noreply@freshdrop.app>',
          to: [customer.email],
          subject: personalizedSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${personalizedSubject}</h2>
              <div style="line-height: 1.6; color: #666;">
                ${personalizedMessage.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #999;">
                  This message was sent by FreshDrop Marketing. 
                  <a href="#" style="color: #007bff;">Unsubscribe</a>
                </p>
              </div>
            </div>
          `
        });

        // Log the delivery
        await supabase
          .from('notification_delivery_log')
          .insert({
            customer_id: customer.user_id,
            campaign_id: campaignId,
            template_id: campaign.template.id,
            notification_type: 'email',
            recipient: customer.email,
            subject: personalizedSubject,
            message_content: personalizedMessage,
            status: emailResult.error ? 'failed' : 'sent',
            delivery_provider: 'resend',
            provider_message_id: emailResult.data?.id,
            error_message: emailResult.error?.message
          });

        return { success: !emailResult.error, customer: customer.email };
      } catch (error) {
        console.error(`Failed to send to ${customer.email}:`, error);
        
        // Log failed delivery
        await supabase
          .from('notification_delivery_log')
          .insert({
            customer_id: customer.user_id,
            campaign_id: campaignId,
            template_id: campaign.template?.id,
            notification_type: 'email',
            recipient: customer.email,
            subject: campaign.template?.subject || '',
            message_content: campaign.template?.message || '',
            status: 'failed',
            delivery_provider: 'resend',
            error_message: error.message
          });

        return { success: false, customer: customer.email, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Update campaign analytics
    await updateCampaignAnalytics(campaignId, successCount, failCount);

    console.log(`Marketing automation completed: ${successCount} sent, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      sent: successCount,
      failed: failCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in marketing automation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function getSegmentConditions(segmentName: string) {
  const { data: segment } = await supabase
    .from('customer_segments')
    .select('conditions')
    .eq('name', segmentName)
    .eq('is_active', true)
    .single();
  
  return segment?.conditions || {};
}

async function getCustomersFromSegment(conditions: any) {
  // Implement segment logic based on conditions
  // For now, return all customers - this would be enhanced based on specific segment rules
  const { data: customers } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name');
  
  if (!customers) return [];

  const customerEmails = await Promise.all(
    customers.map(async (customer) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
      return authUser.user ? {
        ...customer,
        email: authUser.user.email
      } : null;
    })
  );
  
  return customerEmails.filter(Boolean);
}

function personalizeMessage(message: string, customer: any): string {
  return message
    .replace(/{customerName}/g, customer.first_name || 'Valued Customer')
    .replace(/{firstName}/g, customer.first_name || 'Friend')
    .replace(/{lastName}/g, customer.last_name || '');
}

async function updateCampaignAnalytics(campaignId: string, sentCount: number, failedCount: number) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await supabase
    .from('campaign_analytics')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('campaign_analytics')
      .update({
        sent_count: existing.sent_count + sentCount,
        delivered_count: existing.delivered_count + sentCount - failedCount
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: campaignId,
        date: today,
        sent_count: sentCount,
        delivered_count: sentCount - failedCount
      });
  }
}

serve(handler);
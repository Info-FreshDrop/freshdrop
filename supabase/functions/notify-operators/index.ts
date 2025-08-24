import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  type: 'new_order' | 'order_update' | 'broadcast';
  zipCodes?: string[];
  orderId?: string;
  message: string;
  title: string;
  orderData?: {
    zipCode: string;
    serviceName: string;
    totalAmount: number;
    operatorEarnings: number;
    isExpress: boolean;
    customerName?: string;
    pickupAddress?: string;
  };
}

// Function to get templates from database
async function getNotificationTemplates(supabase: any, notificationType: string) {
  const { data, error } = await supabase
    .from('operator_notification_templates')
    .select('*')
    .eq('notification_type', notificationType)
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching notification templates:', error);
    return null;
  }
  
  return data;
}

// Function to replace template variables
function replaceTemplateVariables(template: string, variables: any) {
  let result = template;
  
  // Replace all variables in the format {variableName}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  
  return result;
}

// Function to log notification attempts
async function logNotification(supabase: any, type: string, operatorId: string, status: string, title: string, message: string, orderId?: string) {
  try {
    await supabase.from('notification_logs').insert({
      notification_type: type,
      customer_id: operatorId,
      order_id: orderId,
      status: status,
      message_content: message,
      recipient: title
    });
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, zipCodes, orderId, message, title, orderData }: NotificationRequest = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get API keys
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    let targetOperators: any[] = []
    let successCount = 0
    let failedCount = 0

    // Get notification templates
    const templates = await getNotificationTemplates(supabase, type);
    if (!templates || templates.length === 0) {
      console.error('No notification templates found for type:', type);
      return new Response(JSON.stringify({ error: 'No notification templates found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create template lookup by channel
    const templateByChannel = templates.reduce((acc: any, template: any) => {
      acc[template.channel] = template;
      return acc;
    }, {});

    if (type === 'new_order') {
      console.log('Looking for operators with zip codes:', zipCodes);
      
      const { data: operators, error: operatorError } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          zip_codes,
          profiles:user_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .contains('zip_codes', zipCodes);

      if (operatorError) {
        console.error('Error fetching operators:', operatorError);
        return new Response(JSON.stringify({ error: 'Failed to fetch operators' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      targetOperators = operators || [];
    } else if (type === 'broadcast') {
      console.log('Broadcasting to all active operators');
      
      const { data: operators, error: operatorError } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          profiles:user_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      if (operatorError) {
        console.error('Error fetching operators:', operatorError);
        return new Response(JSON.stringify({ error: 'Failed to fetch operators' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      targetOperators = operators || [];
    }

    console.log(`Found ${targetOperators.length} operators to notify`)

    for (const operator of targetOperators) {
      const profile = operator.profiles;
      if (!profile) continue;

      console.log(`Processing operator: ${profile.first_name} ${profile.last_name} (${profile.email})`);

      // Create template variables for replacement
      const templateVariables = {
        operatorName: profile.first_name || 'Operator',
        serviceName: orderData?.serviceName || 'Service',
        zipCode: orderData?.zipCode || 'Unknown',
        earnings: orderData?.operatorEarnings ? (orderData.operatorEarnings / 100).toFixed(2) : '0.00',
        orderId: orderId || 'Unknown',
        orderNumber: orderId?.split('-')[0]?.toUpperCase() || 'Unknown',
        expressBadge: orderData?.isExpress ? '\n- ⚡ Express Service' : '',
        expressText: orderData?.isExpress ? ' (Express)' : '',
        message: message || ''
      };

      // Log push notification
      await logNotification(supabase, 'push', operator.user_id, 'success', title, message, orderId);

      // Send SMS if phone number available and template exists
      if (profile.phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && templateByChannel.sms) {
        try {
          const smsTemplate = templateByChannel.sms;
          const smsMessage = replaceTemplateVariables(smsTemplate.message, templateVariables);
          
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
          
          const smsBody = new URLSearchParams();
          smsBody.append('From', TWILIO_PHONE_NUMBER);
          smsBody.append('To', `+1${profile.phone.replace(/\D/g, '')}`);
          smsBody.append('Body', `Sent from your Twilio trial account - ${smsMessage}`);

          const smsResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: smsBody
          });

          if (smsResponse.ok) {
            await logNotification(supabase, 'sms', operator.user_id, 'success', smsTemplate.subject, smsMessage, orderId);
            console.log(`SMS sent successfully to ${profile.phone}`);
          } else {
            const errorData = await smsResponse.text();
            console.error('SMS sending failed:', errorData);
            await logNotification(supabase, 'sms', operator.user_id, 'failed', smsTemplate.subject, `Failed to send SMS: ${errorData}`, orderId);
          }
        } catch (smsError) {
          console.error('SMS sending error:', smsError);
          await logNotification(supabase, 'sms', operator.user_id, 'failed', 'SMS Error', `SMS error: ${smsError}`, orderId);
        }
      }

      // Send email if we have the verified email, Resend API key, and template exists
      if (profile.email && RESEND_API_KEY && templateByChannel.email) {
        try {
          const resend = new Resend(RESEND_API_KEY);
          const emailTemplate = templateByChannel.email;
          
          // Replace template variables in subject and message
          const emailSubject = replaceTemplateVariables(emailTemplate.subject, templateVariables);
          const emailMessage = replaceTemplateVariables(emailTemplate.message, templateVariables);
          
          // For new orders, send to the verified email for testing
          const emailTo = type === 'new_order' ? 'magdventures@gmail.com' : profile.email;
          
          const emailResponse = await resend.emails.send({
            from: 'FreshDrop <onboarding@resend.dev>',
            to: [emailTo],
            subject: emailSubject,
            html: emailMessage.replace(/\n/g, '<br>'),
          });

          if (emailResponse.error) {
            console.error('Email sending error:', emailResponse.error);
            await logNotification(supabase, 'email', operator.user_id, 'failed', emailSubject, `Email error: ${JSON.stringify(emailResponse.error)}`, orderId);
          } else {
            console.log('Email sent successfully:', emailResponse.data);
            await logNotification(supabase, 'email', operator.user_id, 'success', emailSubject, emailMessage, orderId);
            successCount++;
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          await logNotification(supabase, 'email', operator.user_id, 'failed', 'Email Error', `Email error: ${emailError}`, orderId);
          failedCount++;
        }
      }
    }

    console.log(`Notification sending completed: ${successCount} successful, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        operatorsNotified: targetOperators.length,
        successfulNotifications: successCount,
        failedNotifications: failedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-operators function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    isExpress: boolean;
    customerName?: string;
    pickupAddress?: string;
  };
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

    let targetOperators: any[] = []

    if (type === 'new_order' && zipCodes) {
      // Find active operators in the specified zip codes
      const { data: operators, error } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          push_notification_token,
          notifications_enabled,
          profiles!washers_user_id_profiles_fkey(first_name, last_name, phone, opt_in_sms)
        `)
        .eq('is_active', true)
        .eq('is_online', true)
        .eq('notifications_enabled', true)
        .overlaps('zip_codes', zipCodes)

      if (error) {
        console.error('Error fetching operators:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch operators' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      targetOperators = operators || []
    }

    console.log(`Found ${targetOperators.length} operators to notify`)

    // Send notifications to each operator
    const notificationPromises = targetOperators.map(async (operator) => {
      const notifications = []

      // Send Push Notification (if token exists and enabled)
      if (operator.push_notification_token) {
        try {
          // This would require FCM/APNs integration
          // For now, we'll log it and you'd implement actual push notification service
          console.log(`Would send push notification to token: ${operator.push_notification_token}`)
          
          // Store notification in database for tracking
          await supabase.from('notification_logs').insert({
            notification_type: 'push',
            customer_id: operator.user_id,
            order_id: orderId,
            status: 'sent',
            message_content: message,
            recipient: operator.push_notification_token
          })
          
          notifications.push('push')
        } catch (error) {
          console.error('Push notification error:', error)
        }
      }

      // Send SMS if user opted in and has phone number
      if (operator.profiles?.opt_in_sms && operator.profiles?.phone) {
        try {
          const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
          const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
          const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

          if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            const smsBody = orderData 
              ? `🧺 ${title}\n${orderData.serviceName} in ${orderData.zipCode}\n$${(orderData.totalAmount / 100).toFixed(2)}${orderData.isExpress ? ' (Express)' : ''}\nOpen FreshDrop app to claim!`
              : `🧺 ${title}\n${message}`

            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  From: twilioPhoneNumber,
                  To: operator.profiles.phone,
                  Body: smsBody
                }).toString()
              }
            )

            if (response.ok) {
              await supabase.from('notification_logs').insert({
                notification_type: 'sms',
                customer_id: operator.user_id,
                order_id: orderId,
                status: 'sent',
                message_content: smsBody,
                recipient: operator.profiles.phone
              })
              notifications.push('sms')
              console.log(`SMS sent to operator ${operator.user_id}: ${operator.profiles.phone}`)
            } else {
              const errorText = await response.text()
              console.error('Twilio SMS error:', errorText)
              
              await supabase.from('notification_logs').insert({
                notification_type: 'sms',
                customer_id: operator.user_id,
                order_id: orderId,
                status: 'failed',
                message_content: smsBody,
                recipient: operator.profiles.phone,
                error_message: errorText
              })
            }
          }
        } catch (error) {
          console.error('SMS sending error:', error)
        }
      }

      return {
        operatorId: operator.user_id,
        notificationsSent: notifications
      }
    })

    const results = await Promise.allSettled(notificationPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Notification sending completed: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        operatorsNotified: targetOperators.length,
        successfulNotifications: successful,
        failedNotifications: failed
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
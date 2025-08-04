import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  orderId: string;
  customerId: string;
  status: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  orderNumber?: string;
  currentStep?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerId, status, customerEmail, customerPhone, customerName, orderNumber }: NotificationRequest = await req.json();

    console.log('=== NOTIFICATION REQUEST ===');
    console.log('Order ID:', orderId);
    console.log('Customer ID:', customerId);
    console.log('Status:', status);
    console.log('Provided email:', customerEmail);
    console.log('Provided phone:', customerPhone);
    console.log('Provided name:', customerName);

    // Log notification attempt
    const logNotification = async (type: string, recipient: string, logStatus: string, messageContent: string, error?: string) => {
      try {
        await supabase.from('notification_logs').insert({
          order_id: orderId,
          customer_id: customerId,
          notification_type: type,
          status: logStatus,
          recipient: recipient,
          message_content: messageContent,
          error_message: error,
          sent_at: logStatus === 'sent' ? new Date().toISOString() : null
        });
      } catch (logError) {
        console.error('Failed to log notification:', logError);
      }
    };

    // Get customer details if not provided
    let email = customerEmail;
    let phone = customerPhone;
    let name = customerName;

    if (!email || !phone || !name) {
      console.log('Fetching missing customer details...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', customerId)
        .single();

      console.log('Profile fetch result:', { profile, profileError });

      if (profile) {
        name = name || `${profile.first_name} ${profile.last_name}`;
        phone = phone || profile.phone;
      }

      if (!email) {
        console.log('Fetching user email...');
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(customerId);
        console.log('User fetch result:', { user: user?.email, userError });
        email = user?.email;
      }
    }

    console.log('Final customer details:');
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Name:', name);

    const statusMessages = {
      'unclaimed': {
        subject: 'Order Confirmed - Looking for Operator',
        message: 'Your order has been confirmed! We\'re finding the perfect operator to handle your laundry.'
      },
      'claimed': {
        subject: 'Order Claimed - Operator Assigned',
        message: 'Great news! An operator has been assigned to your order and will contact you soon.'
      },
      'picked_up': {
        subject: 'Laundry Picked Up',
        message: 'Your laundry has been picked up and is on its way to our facility!'
      },
      'washing': {
        subject: 'Laundry Being Washed',
        message: 'Your laundry is currently being washed with care!'
      },
      'drying': {
        subject: 'Laundry Being Dried',
        message: 'Your laundry has been washed and is now being dried!'
      },
      'folded': {
        subject: 'Laundry Folded & Ready',
        message: 'Your laundry has been cleaned, dried, and neatly folded!'
      },
      'in_progress': {
        subject: 'Laundry In Progress',
        message: 'Your laundry is currently being processed. We\'ll notify you when it\'s ready!'
      },
      'completed': {
        subject: 'Order Complete - Ready for Delivery',
        message: 'Your laundry is clean and ready! It will be delivered to you soon.'
      },
      'delivered': {
        subject: 'Order Delivered',
        message: 'Your clean laundry has been delivered! Thank you for choosing FreshDrop.'
      },
      'cancelled': {
        subject: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact support.'
      }
    };

    const notification = statusMessages[status as keyof typeof statusMessages];
    if (!notification) {
      throw new Error(`Unknown status: ${status}`);
    }

    const promises = [];

    // Send email notification
    if (email) {
      console.log('Sending email to:', email);
      const emailPromise = resend.emails.send({
        from: "FreshDrop <onboarding@resend.dev>",
        to: [email],
        subject: notification.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">FreshDrop Laundry</h1>
            <h2>Order Update - ${notification.subject}</h2>
            <p>Hi ${name || 'Valued Customer'},</p>
            <p>${notification.message}</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <strong>Order Details:</strong><br>
              Order ID: ${orderNumber || orderId}<br>
              Status: ${status.replace('_', ' ').toUpperCase()}
            </div>
            <p>Thank you for choosing FreshDrop!</p>
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        `,
      });
      promises.push(emailPromise);
      
      // Log email attempt
      await logNotification('email', email, 'pending', notification.message);
    }

    // Send SMS notification
    if (phone) {
      const smsMessage = `FreshDrop: ${notification.subject}. ${notification.message} Order: ${orderNumber || orderId}`;
      
      const smsPromise = fetch('https://api.twilio.com/2010-04-01/Accounts/' + Deno.env.get('TWILIO_ACCOUNT_SID') + '/Messages.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(Deno.env.get('TWILIO_ACCOUNT_SID') + ':' + Deno.env.get('TWILIO_AUTH_TOKEN')),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
          To: phone,
          Body: smsMessage,
        }),
      });
      promises.push(smsPromise);
      
      // Log SMS attempt
      await logNotification('sms', phone, 'pending', smsMessage);
    }

    console.log(`Attempting to send ${promises.length} notifications...`);
    const results = await Promise.allSettled(promises);
    
    // Log results with detailed information and update database
    results.forEach(async (result, index) => {
      const type = index === 0 && email ? 'email' : 'sms';
      const recipient = type === 'email' ? email : phone;
      const messageContent = type === 'email' ? notification.message : `FreshDrop: ${notification.subject}. ${notification.message} Order: ${orderNumber || orderId}`;
      
      if (result.status === 'rejected') {
        console.error(`${type.toUpperCase()} notification failed:`, result.reason);
        await logNotification(type, recipient!, 'failed', messageContent, result.reason?.toString());
      } else {
        console.log(`${type.toUpperCase()} notification sent successfully:`, result.value);
        await logNotification(type, recipient!, 'sent', messageContent);
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: !!email,
        smsSent: !!phone,
        results: results.map(r => r.status)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error sending notifications:', error);
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
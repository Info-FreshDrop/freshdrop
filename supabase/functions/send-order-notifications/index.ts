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

    console.log('Sending notifications for order:', orderId, 'status:', status);

    // Get customer details if not provided
    let email = customerEmail;
    let phone = customerPhone;
    let name = customerName;

    if (!email || !phone || !name) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', customerId)
        .single();

      if (profile) {
        name = name || `${profile.first_name} ${profile.last_name}`;
        phone = phone || profile.phone;
      }

      if (!email) {
        const { data: { user } } = await supabase.auth.admin.getUserById(customerId);
        email = user?.email;
      }
    }

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
      promises.push(
        resend.emails.send({
          from: "FreshDrop <orders@freshdrop.com>",
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
        })
      );
    }

    // Send SMS notification
    if (phone) {
      const smsMessage = `FreshDrop: ${notification.subject}. ${notification.message} Order: ${orderNumber || orderId}`;
      
      promises.push(
        fetch('https://api.twilio.com/2010-04-01/Accounts/' + Deno.env.get('TWILIO_ACCOUNT_SID') + '/Messages.json', {
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
        })
      );
    }

    const results = await Promise.allSettled(promises);
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Notification ${index} failed:`, result.reason);
      } else {
        console.log(`Notification ${index} sent successfully`);
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
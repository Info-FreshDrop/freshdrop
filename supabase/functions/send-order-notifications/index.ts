import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  // New message notification fields
  notification_type?: string;
  customer_id?: string;
  operator_id?: string;
  order_id?: string;
  subject?: string;
  message?: string;
  sender_name?: string;
  
  // Legacy order status fields
  orderId?: string;
  customerId?: string;
  status?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  orderNumber?: string;
  currentStep?: number;
  step?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Initialize Resend with API key validation
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable is not set");
}
const resend = new Resend(RESEND_API_KEY);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: NotificationRequest = await req.json();
    console.log('=== NOTIFICATION REQUEST ===', requestData);

    // Handle new message notifications
    if (requestData.notification_type === 'message') {
      return await handleMessageNotification(requestData);
    }

    // Handle legacy order status notifications
    return await handleOrderStatusNotification(requestData);

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

async function handleMessageNotification(data: NotificationRequest): Promise<Response> {
  const { customer_id, operator_id, order_id, subject, message, sender_name } = data;
  
  let recipientEmail: string | undefined;
  let recipientName: string | undefined;
  let recipientId = customer_id;

  // Determine recipient (if operator_id is provided and different from customer_id, send to operator)
  if (operator_id && operator_id !== customer_id) {
    recipientId = operator_id;
  }

  if (!recipientId) {
    throw new Error('No recipient ID provided');
  }

  // Get recipient details
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('user_id', recipientId)
    .single();

  if (profile) {
    recipientEmail = profile.email;
    recipientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  }

  // If no email in profile, get from auth
  if (!recipientEmail) {
    const { data: authUser } = await supabase.auth.admin.getUserById(recipientId);
    if (authUser?.user) {
      recipientEmail = authUser.user.email;
      recipientName = recipientName || authUser.user.user_metadata?.first_name || 'User';
    }
  }

  if (!recipientEmail) {
    console.error('No email found for recipient:', recipientId);
    return new Response(
      JSON.stringify({ error: 'Recipient email not found' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Send email notification
  console.log('Sending message notification email to:', recipientEmail);
  
  await resend.emails.send({
    from: "FreshDrop <onboarding@resend.dev>",
    to: [recipientEmail],
    subject: subject || 'New Message',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">FreshDrop Laundry</h1>
        <h2>${subject || 'New Message'}</h2>
        <p>Hi ${recipientName || 'User'},</p>
        <p>You have received a new message${sender_name ? ` from ${sender_name}` : ''}:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message || 'No message content'}
        </div>
        <p>Please log in to your FreshDrop account to respond.</p>
        <p>Thank you for choosing FreshDrop!</p>
      </div>
    `,
  });

  return new Response(
    JSON.stringify({ success: true, emailSent: true }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}

async function handleOrderStatusNotification(data: NotificationRequest): Promise<Response> {
  const { orderId, customerId, status, customerEmail, customerPhone, customerName, orderNumber, step } = data;

  if (!orderId || !customerId || !status) {
    throw new Error('Missing required fields for order notification');
  }

  console.log('=== ORDER STATUS NOTIFICATION ===');
  console.log('Order ID:', orderId);
  console.log('Customer ID:', customerId);
  console.log('Status:', status);
  console.log('Step:', step);
  
  // Validate critical environment variables
  if (!RESEND_API_KEY) {
    throw new Error('Email service not configured - RESEND_API_KEY missing');
  }

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
      .select('email, first_name, last_name, phone')
      .eq('user_id', customerId)
      .single();

    console.log('Profile fetch result:', { profile, profileError });

    if (profile) {
      email = email || profile.email;
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

  // Fetch notification template from database
  let template;
  if (step) {
    console.log('Looking for step-based template:', step);
    const { data: stepTemplate } = await supabase
      .from('notification_templates')
      .select('subject, message')
      .eq('trigger_step', step)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();
    
    template = stepTemplate;
  }

  // If no step-based template found, try status-based
  if (!template) {
    console.log('Looking for status-based template:', status);
    const { data: statusTemplate } = await supabase
      .from('notification_templates')
      .select('subject, message')
      .eq('status', status)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();

    template = statusTemplate;
  }

  // Fallback status messages if template not found
  const defaultMessages = {
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
    'rinsing': {
      subject: 'Rinse Cycle - Fresh Drop',
      message: 'Your laundry is in the rinse cycle, almost ready for drying.'
    },
    'drying': {
      subject: 'Laundry Being Dried',
      message: 'Your laundry has been washed and is now being dried!'
    },
    'folding': {
      subject: 'Folding & Packaging - Fresh Drop',
      message: 'Your clean laundry is being carefully folded and packaged for delivery.'
    },
    'delivering': {
      subject: 'Out for Delivery - Fresh Drop',
      message: 'Your fresh, clean laundry is out for delivery and will arrive soon!'
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

  // Use template if available, otherwise use default
  const notification = template || defaultMessages[status as keyof typeof defaultMessages];
  if (!notification) {
    throw new Error(`Unknown status: ${status}`);
  }

  // Replace variables in template message
  const processedMessage = notification.message.replace(/\{customerName\}/g, name || 'Valued Customer');

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
          <p>${processedMessage}</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order ID: ${orderNumber || orderId}<br>
            Status: ${status.replace('_', ' ').toUpperCase()}
            ${step ? `<br>Step: ${step}` : ''}
          </div>
          <p>Thank you for choosing FreshDrop!</p>
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    }).then(async (result) => {
      console.log('Email API response:', result);
      if (result.error) {
        throw new Error(`Resend API error: ${result.error.message}`);
      }
      await logNotification('email', email, 'sent', notification.message);
      return result;
    }).catch(async (error) => {
      console.error('Email sending failed:', error);
      await logNotification('email', email, 'failed', notification.message, error.message);
      throw error;
    });
    
    promises.push(emailPromise);
  }

  // Send SMS notification  
  if (phone && Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN')) {
    console.log('Sending SMS to:', phone);
    const smsMessage = `FreshDrop: ${notification.subject}. ${processedMessage} Order: ${orderNumber || orderId}`;
    
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
    }).then(async (response) => {
      const result = await response.json();
      console.log('SMS API response:', result);
      if (!response.ok) {
        throw new Error(`Twilio API error: ${result.message}`);
      }
      await logNotification('sms', phone, 'sent', smsMessage);
      return result;
    }).catch(async (error) => {
      console.error('SMS sending failed:', error);
      await logNotification('sms', phone, 'failed', smsMessage, error.message);
      throw error;
    });
    
    promises.push(smsPromise);
  } else if (phone) {
    console.log('SMS not sent - Twilio not configured');
    await logNotification('sms', phone, 'failed', 'SMS service not configured', 'Twilio credentials missing');
  }

  console.log(`Attempting to send ${promises.length} notifications...`);
  const results = await Promise.allSettled(promises);
  
  console.log('Notification results:', results.map(r => ({ status: r.status, reason: r.status === 'rejected' ? r.reason?.message : 'success' })));

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
}

serve(handler);
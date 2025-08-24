import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OperatorApprovalData {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  zip_code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== OPERATOR APPROVAL NOTIFICATION ===");
    
    const { approval_data }: { approval_data: OperatorApprovalData } = await req.json();
    
    console.log("Approval data:", {
      id: approval_data.application_id,
      name: `${approval_data.first_name} ${approval_data.last_name}`,
      email: approval_data.email,
      zip_code: approval_data.zip_code
    });

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create auth user account with phone number as temporary password
    console.log("Creating auth user account...");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: approval_data.email,
      password: approval_data.phone, // Phone number as initial password
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: approval_data.first_name,
        last_name: approval_data.last_name,
        phone: approval_data.phone,
        application_id: approval_data.application_id,
        needs_onboarding: true
      }
    });

    if (authError) {
      console.error("Auth user creation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create user account", details: authError }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Auth user created successfully:", authUser.user?.id);

    // Add operator role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user!.id,
        role: 'operator'
      });

    if (roleError) {
      console.error("Role assignment failed:", roleError);
    }

    // Create washer profile
    const { error: washerError } = await supabase
      .from('washers')
      .insert({
        user_id: authUser.user!.id,
        zip_codes: [approval_data.zip_code],
        is_active: true,
        is_verified: false // Will be set to true after onboarding completion
      });

    if (washerError) {
      console.error("Washer profile creation failed:", washerError);
    }

    const emailSubject = `🎉 Congratulations! Your FreshDrop Application Has Been Approved`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to FreshDrop!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your operator application has been approved!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${approval_data.first_name}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Congratulations! We're excited to let you know that your application to become a FreshDrop operator has been <strong>approved</strong>! 
            Welcome to our team of trusted laundry professionals.
          </p>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2196f3;">
            <h3 style="color: #1976d2; margin-top: 0;">🚀 Next Steps - Complete Your Onboarding</h3>
            <p style="color: #333; margin-bottom: 0;"><strong>Ready to get started? Here's how to access your account:</strong></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #ddd; margin: 20px 0;">
            <h4 style="color: #333; margin-top: 0;">Your Login Credentials:</h4>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${approval_data.email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${approval_data.phone}</p>
            <p style="color: #666; font-size: 14px; margin-top: 15px;">
              <em>For security, you'll be asked to change your password during onboarding.</em>
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              Complete Your Onboarding →
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">📋 What You'll Complete During Onboarding:</h4>
            <ul style="color: #856404; margin-bottom: 0;">
              <li>Complete your operator profile and preferences</li>
              <li>Upload required tax documentation (W-9 form)</li>
              <li>Set up your service areas and availability</li>
              <li>Review operator guidelines and best practices</li>
            </ul>
          </div>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p style="color: #155724; margin: 0;">
              <strong>💰 Earning Potential:</strong> Start earning immediately after completing onboarding! 
              You'll receive notifications for orders in your service area and can begin building your customer base right away.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Questions? Need help? Contact our support team at <a href="mailto:support@freshdroplaundry.com">support@freshdroplaundry.com</a> 
            or reply to this email.
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Welcome to the FreshDrop family!<br>
            <strong>The FreshDrop Team</strong>
          </p>
        </div>
      </div>
    `;

    console.log("Sending approval email to:", approval_data.email);

    const emailResponse = await resend.emails.send({
      from: "FreshDrop Team <welcome@freshdroplaundry.com>",
      to: [approval_data.email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailResponse.error) {
      console.error("Email sending failed:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResponse.error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Approval email sent successfully:", emailResponse.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Operator approved and notification sent",
        user_id: authUser.user?.id,
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in operator-approval-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
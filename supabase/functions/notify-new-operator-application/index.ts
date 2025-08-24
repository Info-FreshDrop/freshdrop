import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OperatorApplicationData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  experience: string;
  motivation: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== NEW OPERATOR APPLICATION NOTIFICATION ===");
    
    const { application }: { application: OperatorApplicationData } = await req.json();
    
    console.log("Application data:", {
      id: application.id,
      name: `${application.first_name} ${application.last_name}`,
      email: application.email,
      zip_code: application.zip_code
    });

    const emailSubject = `New Operator Application - ${application.first_name} ${application.last_name}`;
    
    const emailBody = `
      <h2>New Operator Application Received</h2>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Applicant Information</h3>
        <p><strong>Name:</strong> ${application.first_name} ${application.last_name}</p>
        <p><strong>Email:</strong> ${application.email}</p>
        <p><strong>Phone:</strong> ${application.phone}</p>
        <p><strong>Address:</strong> ${application.address}, ${application.city}, ${application.state} ${application.zip_code}</p>
        <p><strong>Vehicle Type:</strong> ${application.vehicle_type}</p>
        <p><strong>Applied:</strong> ${new Date(application.created_at).toLocaleString()}</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Experience</h3>
        <p>${application.experience}</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Motivation</h3>
        <p>${application.motivation}</p>
      </div>
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Action Required:</strong> Please review this application in the admin dashboard and follow up with the applicant.</p>
        <p><strong>Application ID:</strong> ${application.id}</p>
      </div>
      
      <hr style="margin: 30px 0;" />
      <p style="color: #666; font-size: 14px;">
        This is an automated notification from FreshDrop Laundry Management System.
      </p>
    `;

    console.log("Sending email notification to info@freshdroplaundry.com...");

    const emailResponse = await resend.emails.send({
      from: "FreshDrop Notifications <notifications@freshdroplaundry.com>",
      to: ["info@freshdroplaundry.com"],
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

    console.log("Email sent successfully:", emailResponse.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification email sent successfully",
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in notify-new-operator-application function:", error);
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
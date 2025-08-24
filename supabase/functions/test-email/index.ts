import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resend API key exists:", !!resendApiKey);
    console.log("API key length:", resendApiKey.length);
    console.log("API key prefix:", resendApiKey.substring(0, 8));

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: 'FreshDrop <test@freshdrop.com>',
      to: ['operator@freshdroplaundry.com'],
      subject: 'Test Email from Supabase',
      html: '<h1>This is a test email</h1><p>If you receive this, Resend is working!</p>',
    });

    console.log("Email response:", emailResponse);

    if (emailResponse.error) {
      return new Response(
        JSON.stringify({ 
          error: "Email sending failed", 
          details: emailResponse.error 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Test email sent successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
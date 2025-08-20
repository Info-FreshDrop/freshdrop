import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  reason?: string;
  requestDataExport?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { reason, requestDataExport = false }: RequestBody = await req.json();

    // Check for active orders that would prevent deletion
    const { data: activeOrders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('id, status')
      .eq('customer_id', user.id)
      .in('status', ['placed', 'claimed', 'in_progress']);

    if (ordersError) {
      console.error('Error checking active orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to check active orders' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (activeOrders && activeOrders.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot delete account with active orders. Please complete or cancel all active orders first.',
          activeOrders: activeOrders.length
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if there's already a pending deletion request
    const { data: existingRequest, error: checkError } = await supabaseClient
      .from('account_deletion_requests')
      .select('id, status, scheduled_deletion_at, data_export_requested')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing requests:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing deletion requests' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (existingRequest) {
      // If there's already a pending request, disable the account immediately and return success
      console.log('Found existing deletion request, proceeding with account disable:', existingRequest.id);
      
      // Disable the account immediately
      const { error: disableError } = await supabaseClient.auth.admin.updateUserById(
        user.id,
        { 
          user_metadata: { 
            ...user.user_metadata,
            account_disabled: true,
            pending_deletion: true,
            deletion_requested_at: new Date().toISOString()
          }
        }
      );

      if (disableError) {
        console.error('Error disabling user account:', disableError);
        return new Response(
          JSON.stringify({ error: 'Failed to disable account' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('User account disabled successfully for existing request:', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account deletion request processed successfully',
          scheduledDeletion: existingRequest.scheduled_deletion_at,
          requestId: existingRequest.id,
          dataExportRequested: existingRequest.data_export_requested
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Immediately disable the user account using admin API
    const { error: disableError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { 
        user_metadata: { 
          ...user.user_metadata,
          account_disabled: true,
          pending_deletion: true,
          deletion_requested_at: new Date().toISOString()
        }
      }
    );

    if (disableError) {
      console.error('Error disabling user account:', disableError);
      return new Response(
        JSON.stringify({ error: 'Failed to disable account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User account disabled successfully:', user.id);

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabaseClient
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason: reason || null,
        data_export_requested: requestDataExport,
        status: 'pending'
      })
      .select('id, scheduled_deletion_at, confirmation_token')
      .single();

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create deletion request' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If data export is requested, create export log
    if (requestDataExport) {
      const { error: exportError } = await supabaseClient
        .from('data_export_logs')
        .insert({
          user_id: user.id,
          export_type: 'account_deletion',
          status: 'requested'
        });

      if (exportError) {
        console.error('Error creating export log:', exportError);
        // Don't fail the deletion request if export logging fails
      }
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', user.id)
      .single();

    // TODO: Send confirmation email using Resend
    // This would typically be handled by a separate email service
    console.log('Account deletion requested for user:', user.id, {
      scheduledDeletion: deletionRequest.scheduled_deletion_at,
      dataExportRequested: requestDataExport,
      userEmail: profile?.email || user.email
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion request submitted successfully',
        scheduledDeletion: deletionRequest.scheduled_deletion_at,
        requestId: deletionRequest.id,
        dataExportRequested: requestDataExport
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in request-account-deletion function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
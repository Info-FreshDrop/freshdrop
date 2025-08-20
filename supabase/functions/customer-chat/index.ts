import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client for data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user context if available
    let userContext = '';
    if (userId) {
      // Get user's recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (orders && orders.length > 0) {
        userContext += `\nUser's recent orders:\n${orders.map(order => 
          `- Order ${order.id.slice(0, 8)}: ${order.status}, $${(order.total_amount_cents / 100).toFixed(2)}, ${new Date(order.created_at).toLocaleDateString()}`
        ).join('\n')}`;
      }

      if (profile) {
        userContext += `\nUser profile: ${profile.first_name} ${profile.last_name}`;
      }
    }

    // Get available lockers for context
    const { data: lockers } = await supabase
      .from('lockers')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'available');

    // Get active promo codes
    const { data: promoCodes } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('is_active', true);

    // Get service areas information
    const { data: serviceAreas } = await supabase
      .from('service_areas')
      .select('zip_code, is_active, pickup_available, delivery_available')
      .eq('is_active', true)
      .limit(50);

    // Get available operators count by area
    const { data: operatorStats } = await supabase
      .from('profiles')
      .select('zip_codes_served, is_available')
      .eq('user_type', 'operator')
      .eq('is_available', true);

    // Get recent announcements or service updates
    const { data: announcements } = await supabase
      .from('announcements')
      .select('title, message, priority')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    // Get common order issues for better troubleshooting
    const { data: commonIssues } = await supabase
      .from('order_issues')
      .select('issue_type, resolution_steps')
      .eq('is_resolved', true)
      .limit(10);

    const systemPrompt = `You are FreshDrop's helpful customer service AI assistant. You help customers with laundry service questions.

IMPORTANT GUIDELINES:
- Always be friendly, helpful, and professional
- For complex issues or complaints, offer to connect them with a human agent
- Only provide information you're certain about
- If you can't help, say "Let me connect you with a human agent who can better assist you"

SERVICES OFFERED:
- Wash & Fold: $35/bag
- Wash & Hang Dry: $35/bag  
- Dry Cleaning: Premium service
- Express Service: +$20 for same-day pickup/delivery
- Pickup & Delivery or Locker drop-off options

AVAILABLE LOCKERS:
${lockers?.map(locker => `- ${locker.name}: ${locker.address}, ${locker.zip_code}`).join('\n') || 'No lockers currently available'}

ACTIVE PROMO CODES:
${promoCodes?.map(code => `- ${code.code}: ${code.description} (${code.discount_type === 'percentage' ? code.discount_value + '%' : '$' + code.discount_value} off)`).join('\n') || 'No active promo codes'}

SERVICE AREAS (Available zip codes):
${serviceAreas?.map(area => `- ${area.zip_code}: Pickup: ${area.pickup_available ? 'Yes' : 'No'}, Delivery: ${area.delivery_available ? 'Yes' : 'No'}`).join('\n') || 'Service area information not available'}

OPERATOR AVAILABILITY:
${operatorStats && operatorStats.length > 0 ? `${operatorStats.length} operators currently available` : 'Limited operator availability - may experience longer wait times'}

${announcements && announcements.length > 0 ? `CURRENT ANNOUNCEMENTS:
${announcements.map(ann => `- ${ann.title}: ${ann.message}`).join('\n')}` : ''}

COMMON TROUBLESHOOTING:
${commonIssues?.map(issue => `- ${issue.issue_type}: ${issue.resolution_steps}`).join('\n') || 'Contact support for technical issues'}

COMMON FAQS:
- Service areas: Check by entering your zip code (see service areas above)
- Pickup times: Usually within 2 hours during business hours
- Delivery: Next day delivery included
- Payment: Secure online payment after service
- Lost items: We take full responsibility and provide compensation
- Business hours: Monday-Sunday 7AM-10PM
- Holiday service: Limited availability on major holidays

USER CONTEXT:${userContext}

INSTRUCTIONS:
- For order status questions, provide specific information from their order history above
- For locker issues, help them find the nearest available locker from the list above
- For promo codes, explain current offers and how to apply them
- For service area questions, check the zip codes listed above
- For common issues, use the troubleshooting steps provided
- Always acknowledge announcements if they're relevant to the customer's question

If the user seems frustrated or has a complex issue, offer: "I'd like to connect you with one of our human agents who can provide more personalized assistance. Would you like me to do that?"`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI with messages:', messages.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorData}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Check if AI is suggesting human handoff
    const suggestsHandoff = aiResponse.toLowerCase().includes('human agent') || 
                           aiResponse.toLowerCase().includes('connect you with') ||
                           aiResponse.toLowerCase().includes('speak with someone');

    console.log('AI Response generated:', aiResponse.slice(0, 100) + '...');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      suggestsHandoff,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in customer-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Sorry, I\'m having trouble right now. Please try again or contact our support team.',
      suggestsHandoff: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
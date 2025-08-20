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

// FreshDrop Business Configuration
const BUSINESS_CONFIG = {
  service_areas: {
    primary: "417 metro (Springfield, Nixa, Ozark, Republic)",
    buffer_miles: 10,
    distance_fee: 5
  },
  pricing: {
    bags: {
      small: { price: 30, description: "~15 gal, bathroom-size" },
      medium: { price: 50, description: "13-20 gal kitchen bag, most weekly loads" },
      large: { price: 90, description: "30 gal contractor bag, family or bedding" }
    },
    addons: {
      hang_dry: 8,
      eco_detergent: 5,
      stain_pretreat: 6,
      rush: 15,
      bedding_bundle: 12
    },
    delivery_fee: 6,
    freshpass: { monthly: 14.99, benefits: ["Free delivery", "$5 off rush", "Priority slots", "2x referral credit"] }
  },
  service: {
    turnaround_hours: 48,
    rush_hours: 24,
    pickup_windows: ["7-10am", "11am-2pm", "5-8pm"],
    cancellation_fee_hours: 2,
    route_fee: 10
  },
  policies: {
    refund_window_hours: 72,
    refund_credit: 15,
    damage_cap: 100,
    free_cancel_hours: 2
  }
};

// Intent Classification
const INTENTS = {
  place_order: ["book", "schedule", "pickup", "order", "first time", "new customer"],
  pricing: ["price", "cost", "how much", "expensive", "cheap", "bag", "rate"],
  bag_rules: ["bag size", "overstuff", "fit", "large", "small", "medium"],
  service_area: ["zip", "area", "deliver", "pickup", "location", "address"],
  order_status: ["status", "track", "where", "when", "eta", "progress"],
  freshpass: ["subscription", "membership", "pass", "monthly", "recurring"],
  refund: ["refund", "money back", "unsatisfied", "bad", "terrible", "awful"],
  reschedule: ["reschedule", "change time", "different day", "move"],
  cancel: ["cancel", "don't want", "nevermind"],
  human: ["human", "person", "agent", "speak", "talk", "representative"]
};

// Conversion Copy Templates
const COPY_TEMPLATES = {
  first_order_hook: "Ready for zero-hassle laundry? We do flat-rate bags, 48-hr turnaround. Want me to set up your first pickup now?",
  pricing_quick: "Flat-rate bags, no weighing: Small $30, Medium $50, Large $90. Delivery $6 or free with FreshPass. Standard 48-hr turnaround; Rush +$15 when available. Want me to check the next pickup slot?",
  bag_size_helper: "Picture a kitchen trash bag:\n• Small ($30): ~bathroom-size, tees/underwear/socks.\n• Medium ($50): standard 13-20 gal kitchen bag, most weekly loads.\n• Large ($90): 30 gal contractor bag, family or bedding.\nIf the bag can't cinch closed, we split for safety.",
  freshpass_pitch: "FreshPass is $14.99/mo: free delivery, priority slots, and $5 off rush. If you do 2+ orders/mo, it usually pays for itself.",
  refund_offer: "I'm sorry we missed expectations. I can book a free rewash or apply a $15 credit right now. Which do you prefer?",
  out_of_area: "You're just outside our current map. We can still pick up with a $5 distance fee. Want the next available window?"
};

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

    // Enhanced user context gathering for conversion optimization
    let userProfile = null;
    let orderHistory = [];
    let isFirstTimeVisitor = true;
    let hasActiveOrders = false;
    let hasFreshPass = false;
    let userZip = null;

    if (userId) {
      try {
        // Get comprehensive user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(); // Use maybeSingle to avoid errors when no profile exists

        // Get order history with detailed status
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Check for FreshPass subscription (assuming there's a subscriptions table)
        const { data: subscription } = await supabase
          .from('wallets') // Using wallets as proxy for subscription check
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          userProfile = profile;
          userZip = profile.zip_code || profile.phone?.slice(-5); // fallback
        }

        if (orders && orders.length > 0) {
          isFirstTimeVisitor = false;
          orderHistory = orders;
          hasActiveOrders = orders.some(order => 
            ['pending', 'confirmed', 'picked_up', 'processing', 'out_for_delivery'].includes(order.status)
          );
        }

        hasFreshPass = !!subscription;
      } catch (error) {
        console.error('Error fetching user context (non-critical):', error);
        // Continue without user context - don't fail the whole request
      }
    }

    // Get real-time business data (these should work for unauthenticated users)
    const [
      lockersResult,
      promoCodesResult,
      serviceAreasResult,
      washersResult,
      announcementsResult
    ] = await Promise.allSettled([
      supabase.from('lockers').select('*').eq('is_active', true).eq('status', 'available'),
      supabase.from('promo_codes').select('*').eq('is_active', true).eq('visible_to_customers', true),
      supabase.from('service_areas').select('*').eq('is_active', true),
      supabase.from('washers').select('*').eq('is_active', true).eq('is_online', true),
      supabase.from('app_settings').select('*').eq('setting_key', 'announcements') // Changed from announcements table
    ]);

    // Safely extract data from settled promises
    const lockers = lockersResult.status === 'fulfilled' ? lockersResult.value.data : [];
    const promoCodes = promoCodesResult.status === 'fulfilled' ? promoCodesResult.value.data : [];
    const serviceAreas = serviceAreasResult.status === 'fulfilled' ? serviceAreasResult.value.data : [];
    const washers = washersResult.status === 'fulfilled' ? washersResult.value.data : [];
    const announcements = announcementsResult.status === 'fulfilled' ? 
      (announcementsResult.value.data?.[0]?.setting_value?.announcements || []) : [];

    console.log('Business data loaded:', {
      lockers: lockers?.length || 0,
      promoCodes: promoCodes?.length || 0,
      serviceAreas: serviceAreas?.length || 0,
      washers: washers?.length || 0,
      announcements: announcements?.length || 0
    });

    // Intent Classification
    const classifyIntent = (msg: string) => {
      const lowerMsg = msg.toLowerCase();
      for (const [intent, keywords] of Object.entries(INTENTS)) {
        if (keywords.some(keyword => lowerMsg.includes(keyword))) {
          return intent;
        }
      }
      return 'general';
    };

    const detectedIntent = classifyIntent(message);
    console.log('Detected intent:', detectedIntent);

    // Build conversion-focused system prompt
    const systemPrompt = `You are FreshDrop's AI Concierge. Your job is to convert visitors into scheduled pickups, sell FreshPass, and resolve support with minimal friction.

MISSION: Convert visitors to first order in ≤3 touches, keep CAC low, push FreshPass, prevent churn with proactive save offers, and escalate only when value at risk > order value.

GUARDRAILS:
- Never give legal/medical/chemical advice
- No promises outside policy (ETAs, stains "guaranteed")
- Never take card data in chat—link to secure checkout only
- If customer appears distressed/safety issue → escalate immediately

BRAND VOICE: Friendly, fast, competent, "neighborly pro." 1-2 short sentences per turn, bullets for options, one clear CTA.
Use: "Zero-hassle," "flat-rate bag," "community-vetted operators," "48-hr turnaround"
Avoid: Jargon, "policy says," blame

CURRENT PRICING & CONFIG:
- Small bag: $${BUSINESS_CONFIG.pricing.bags.small.price} (${BUSINESS_CONFIG.pricing.bags.small.description})
- Medium bag: $${BUSINESS_CONFIG.pricing.bags.medium.price} (${BUSINESS_CONFIG.pricing.bags.medium.description})  
- Large bag: $${BUSINESS_CONFIG.pricing.bags.large.price} (${BUSINESS_CONFIG.pricing.bags.large.description})
- Delivery fee: $${BUSINESS_CONFIG.pricing.delivery_fee} (free with FreshPass)
- FreshPass: $${BUSINESS_CONFIG.pricing.freshpass.monthly}/mo → ${BUSINESS_CONFIG.pricing.freshpass.benefits.join(', ')}
- Add-ons: Hang-dry +$${BUSINESS_CONFIG.pricing.addons.hang_dry}, Eco-detergent +$${BUSINESS_CONFIG.pricing.addons.eco_detergent}, Rush +$${BUSINESS_CONFIG.pricing.addons.rush}
- Turnaround: ${BUSINESS_CONFIG.service.turnaround_hours}h standard; Rush ${BUSINESS_CONFIG.service.rush_hours}h when capacity allows
- Pickup windows: ${BUSINESS_CONFIG.service.pickup_windows.join(', ')}
- Cancellation: Free >${BUSINESS_CONFIG.policies.free_cancel_hours}h before pickup; inside ${BUSINESS_CONFIG.policies.free_cancel_hours}h = $${BUSINESS_CONFIG.service.route_fee} route fee

ACTIVE PROMO CODES:
${promoCodes?.map(code => `- ${code.code}: ${code.description} (${code.discount_type === 'percentage' ? code.discount_value + '%' : '$' + code.discount_value} off)`).join('\n') || 'FRESH10: $10 off first order'}

SERVICE AREAS: ${BUSINESS_CONFIG.service_areas.primary} + ${BUSINESS_CONFIG.service_areas.buffer_miles}-mile buffer ($${BUSINESS_CONFIG.service_areas.distance_fee} surcharge)
Available ZIPs: ${serviceAreas?.map(area => area.zip_code).join(', ') || 'Check with customer'}

AVAILABLE LOCKERS:
${lockers?.map(locker => `- ${locker.name}: ${locker.address}`).join('\n') || 'No dropbox locations currently available'}

OPERATOR CAPACITY: ${washers?.length || 0} community-vetted operators online

${announcements?.length ? `CURRENT UPDATES:\n${announcements.map(ann => `- ${ann.title}: ${ann.message}`).join('\n')}` : ''}

USER CONTEXT:
- Profile: ${userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Anonymous visitor'}
- ZIP: ${userZip || 'Unknown'}
- First-time visitor: ${isFirstTimeVisitor ? 'YES' : 'NO'}
- Order history: ${orderHistory.length} orders (${hasActiveOrders ? 'HAS ACTIVE ORDERS' : 'no active orders'})
- FreshPass: ${hasFreshPass ? 'ACTIVE SUBSCRIBER' : 'NOT SUBSCRIBED'}
- Detected intent: ${detectedIntent}

${orderHistory.length > 0 ? `Recent Orders:\n${orderHistory.slice(0, 3).map(order => 
  `- ${order.id.slice(0, 8)}: ${order.status}, $${(order.total_amount_cents / 100).toFixed(2)}, ${new Date(order.created_at).toLocaleDateString()}`
).join('\n')}` : ''}

DECISION RULES:
- If first-time visitor → show "30-second setup" guided flow + FRESH10 promo
- If cart value would have delivery fee and visitor seems recurring → FreshPass nudge
- If capacity tight → hide Rush, offer next-day
- If refund request → offer rewash OR $${BUSINESS_CONFIG.policies.refund_credit} credit, don't argue cause
- If out of area but ≤${BUSINESS_CONFIG.service_areas.buffer_miles} miles → offer $${BUSINESS_CONFIG.service_areas.distance_fee} surcharge

CONVERSATION FLOWS:

FIRST ORDER (conversion priority):
1. Hook: "${COPY_TEMPLATES.first_order_hook}"
2. ZIP check → validate → if out: "${COPY_TEMPLATES.out_of_area}"
3. Pick window: show next 3 slots
4. Bag sizing: "${COPY_TEMPLATES.bag_size_helper}"  
5. Add-ons upsell (one-tap): Hang-dry / Eco detergent / Rush / Bedding bundle
6. FreshPass check: "${COPY_TEMPLATES.freshpass_pitch}"
7. Generate checkout URL with cart

PRICING QUESTIONS: "${COPY_TEMPLATES.pricing_quick}"

REFUND/REDO: "${COPY_TEMPLATES.refund_offer}"

ESCALATION TRIGGERS (create support ticket + human handoff):
- Lost item, damage claim >$50, allergy reaction, repeated quality complaints
- VIP tag, press/media mentions
- Customer uses words: "lawsuit," "BBB," "review," "terrible," "awful" repeatedly

EDGE CASES:
- Biohazard/infestation → "We can't process items with bodily fluids, mold, or infestations. Safety first."
- Dry-clean only → "We're wash-and-fold. Items labeled 'Dry Clean Only' will be set aside and returned unwashed."
- Overstuffed bags → "Bag should cinch fully. If it can't close, we split into next bag size to protect your items."

RESPONSE STYLE: Keep under 2 short sentences. Add action buttons when possible. Always offer next step. Mirror customer energy but stay professional.

Priority Order: Convert → Retain → Save → Escalate.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending conversion-focused request to OpenAI, intent:', detectedIntent);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3, // Lower for more consistent conversion copy
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorData}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Enhanced escalation detection
    const suggestsHandoff = aiResponse.toLowerCase().includes('human agent') || 
                           aiResponse.toLowerCase().includes('connect you with') ||
                           aiResponse.toLowerCase().includes('support ticket') ||
                           message.toLowerCase().includes('lawsuit') ||
                           message.toLowerCase().includes('terrible') ||
                           message.toLowerCase().includes('awful');

    // Track conversion metrics (implement analytics calls here)
    const shouldTrackConversion = detectedIntent === 'place_order' && aiResponse.includes('checkout');
    const shouldTrackFreshPassPitch = aiResponse.toLowerCase().includes('freshpass');

    console.log('Conversion-focused response generated:', {
      intent: detectedIntent,
      suggestsHandoff,
      shouldTrackConversion,
      shouldTrackFreshPassPitch,
      responseLength: aiResponse.length
    });

    return new Response(JSON.stringify({ 
      response: aiResponse,
      suggestsHandoff,
      detectedIntent,
      conversionContext: {
        isFirstTimeVisitor,
        hasFreshPass,
        hasActiveOrders,
        shouldTrackConversion,
        shouldTrackFreshPassPitch
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in customer-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Sorry, I\'m having trouble right now. Please try again or contact our support team.',
      suggestsHandoff: true,
      detectedIntent: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
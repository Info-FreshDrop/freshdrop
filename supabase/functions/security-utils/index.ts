import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
if (Deno.env.get('REQUEST_METHOD') === 'OPTIONS') {
  new Response(null, { headers: corsHeaders });
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RateLimitRequest {
  identifier: string // IP address or user ID
  action: string
  maxAttempts?: number
  windowMinutes?: number
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
  
  // Check existing rate limit record
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action', action)
    .single()

  if (!existing) {
    // Create new rate limit record
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        action,
        attempts: 1,
        window_start: new Date()
      })
    
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  // Check if window has expired
  if (new Date(existing.window_start) < windowStart) {
    // Reset window
    await supabase
      .from('rate_limits')
      .update({
        attempts: 1,
        window_start: new Date()
      })
      .eq('id', existing.id)
    
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  // Check if rate limit exceeded
  if (existing.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  // Increment attempts
  await supabase
    .from('rate_limits')
    .update({
      attempts: existing.attempts + 1
    })
    .eq('id', existing.id)

  return { 
    allowed: true, 
    remaining: maxAttempts - existing.attempts - 1 
  }
}

export async function logSecurityEvent(
  userId: string | null,
  action: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
) {
  await supabase
    .from('security_audit_log')
    .insert({
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    })
}

export function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

export function validateInput(input: string, maxLength: number = 500): string {
  if (!input) return ''
  
  // Remove potential XSS characters and script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, maxLength)
}

Deno.serve(async (req) => {
  // This is a utility function, not meant to be called directly
  return new Response(
    JSON.stringify({ error: 'This is a utility function' }), 
    { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})
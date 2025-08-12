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

interface AuthRequest {
  action: 'login' | 'signup' | 'password_reset'
  email?: string
  password?: string
  metadata?: Record<string, any>
}

async function checkRateLimit(
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

async function logSecurityEvent(
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

function validateInput(input: string, maxLength: number = 500): string {
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

function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, email, password, metadata }: AuthRequest = await req.json()
    const clientIP = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Rate limiting
    const rateLimit = await checkRateLimit(clientIP, action, 5, 15)
    if (!rateLimit.allowed) {
      await logSecurityEvent(null, `${action}_rate_limited`, {
        ip_address: clientIP,
        user_agent: userAgent
      }, clientIP, userAgent)

      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts. Please try again later.',
          remaining: rateLimit.remaining 
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Input validation
    const cleanEmail = email ? validateInput(email, 254) : ''
    const cleanPassword = password ? validateInput(password, 128) : ''

    let result
    switch (action) {
      case 'login':
        result = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        })
        
        await logSecurityEvent(
          result.data.user?.id || null,
          'login_attempt',
          { 
            success: !result.error,
            error: result.error?.message 
          },
          clientIP,
          userAgent
        )
        break

      case 'signup':
        result = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: metadata || {},
            emailRedirectTo: `${req.headers.get('origin') || 'https://app.freshdrop.com'}/`
          }
        })
        
        await logSecurityEvent(
          result.data.user?.id || null,
          'signup_attempt',
          { 
            success: !result.error,
            error: result.error?.message 
          },
          clientIP,
          userAgent
        )
        break

      case 'password_reset':
        result = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${req.headers.get('origin') || 'https://app.freshdrop.com'}/reset-password`
        })
        
        await logSecurityEvent(
          null,
          'password_reset_request',
          { 
            email: cleanEmail,
            success: !result.error,
            error: result.error?.message 
          },
          clientIP,
          userAgent
        )
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify({
        data: result.data,
        error: result.error,
        remaining: rateLimit.remaining
      }),
      { 
        status: result.error ? 400 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Enhanced auth error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
// Enhanced security utility functions for input validation and sanitization

export const sanitizeInput = (input: string, options: {
  maxLength?: number;
  allowHTML?: boolean;
  allowScripts?: boolean;
} = {}): string => {
  if (!input) return '';
  
  const { maxLength = 500, allowHTML = false, allowScripts = false } = options;
  
  let sanitized = input.trim();
  
  // Remove potential XSS scripts
  if (!allowScripts) {
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  // Remove HTML tags if not allowed
  if (!allowHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  return sanitized.substring(0, maxLength);
};

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) return { valid: false, error: 'Email is required' };
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const isValid = emailRegex.test(email);
  
  if (!isValid) return { valid: false, error: 'Invalid email format' };
  if (email.length > 254) return { valid: false, error: 'Email too long' };
  
  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (password.length > 128) return { valid: false, error: 'Password too long' };
  
  // Check for basic complexity
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const complexity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (complexity < 3) {
    return { 
      valid: false, 
      error: 'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters' 
    };
  }
  
  return { valid: true };
};

export const validateZipCode = (zipCode: string): { valid: boolean; error?: string } => {
  if (!zipCode) return { valid: false, error: 'Zip code is required' };
  
  const zipRegex = /^[0-9]{5}(-[0-9]{4})?$/;
  const isValid = zipRegex.test(zipCode.trim());
  
  return isValid 
    ? { valid: true }
    : { valid: false, error: 'Invalid zip code format (use 12345 or 12345-6789)' };
};

export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  
  const cleaned = phone.replace(/\D/g, '');
  const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  const isValid = phoneRegex.test(cleaned);
  
  return isValid 
    ? { valid: true }
    : { valid: false, error: 'Invalid phone number format' };
};

export const sanitizeFileName = (fileName: string): string => {
  if (!fileName) return '';
  
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
};

export const validateUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url) return { valid: false, error: 'URL is required' };
  
  try {
    const urlObj = new URL(url);
    const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    
    return isValid 
      ? { valid: true }
      : { valid: false, error: 'URL must use http or https protocol' };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

export const validateRequired = (value: any, fieldName: string): { valid: boolean; error?: string } => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validateLength = (
  value: string, 
  min: number, 
  max: number, 
  fieldName: string
): { valid: boolean; error?: string } => {
  if (!value) return { valid: false, error: `${fieldName} is required` };
  
  if (value.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  
  if (value.length > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max} characters` };
  }
  
  return { valid: true };
};

// Rate limiting helper for client-side
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return {
    checkLimit: (identifier: string): { allowed: boolean; remaining: number; resetTime?: number } => {
      const now = Date.now();
      const record = attempts.get(identifier);
      
      if (!record || now > record.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1 };
      }
      
      if (record.count >= maxAttempts) {
        return { allowed: false, remaining: 0, resetTime: record.resetTime };
      }
      
      record.count++;
      return { allowed: true, remaining: maxAttempts - record.count };
    },
    
    reset: (identifier: string) => {
      attempts.delete(identifier);
    }
  };
};
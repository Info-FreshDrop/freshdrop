// Security utility functions for input validation and sanitization
// DEPRECATED: Use enhancedInputValidation.ts for new implementations

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove potential XSS characters and script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 500);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

export const validateZipCode = (zipCode: string): boolean => {
  const zipRegex = /^[0-9]{5}(-[0-9]{4})?$/;
  return zipRegex.test(zipCode);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '')
    .substring(0, 100);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};
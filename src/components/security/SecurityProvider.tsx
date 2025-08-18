import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { rateLimitCheck } from '@/utils/inputValidation';

interface SecurityContextType {
  logSecurityEvent: (action: string, details?: any) => void;
  checkRateLimit: (key: string, maxAttempts?: number) => boolean;
  isSecureEnvironment: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isSecureEnvironment, setIsSecureEnvironment] = useState(false);

  useEffect(() => {
    // Check if we're in a secure environment
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost';
    setIsSecureEnvironment(isHTTPS || isLocalhost);

    // Add security headers check
    if (!isHTTPS && !isLocalhost) {
      console.warn('Security Warning: Application is not served over HTTPS');
    }

    // Set up CSP violation reporting
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      console.error('CSP Violation:', event.violatedDirective, event.blockedURI);
      logSecurityEvent('csp_violation', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber
      });
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);

  const logSecurityEvent = async (action: string, details?: any) => {
    try {
      // Get user agent and other security info
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();
      
      // Log locally for immediate debugging
      console.log(`Security Event: ${action}`, { details, timestamp, userAgent });

      // If user is authenticated, log to database
      if (user) {
        await supabase.rpc('log_security_event', {
          p_action: action,
          p_details: details || {},
          p_user_agent: userAgent,
          p_ip_address: null // IP will be captured server-side
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const checkRateLimit = (key: string, maxAttempts: number = 5): boolean => {
    const userId = user?.id || 'anonymous';
    const rateLimitKey = `${userId}_${key}`;
    
    const allowed = rateLimitCheck(rateLimitKey, maxAttempts);
    
    if (!allowed) {
      logSecurityEvent('rate_limit_exceeded', {
        key,
        userId,
        maxAttempts
      });
    }
    
    return allowed;
  };

  const value: SecurityContextType = {
    logSecurityEvent,
    checkRateLimit,
    isSecureEnvironment
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
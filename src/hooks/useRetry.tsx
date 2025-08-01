import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetryCallback?: (attempt: number, error: Error) => void;
}

export const useRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const executeWithRetry = useCallback(async (
    operation: () => Promise<any>,
    options: RetryOptions = {}
  ): Promise<any> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      onRetryCallback
    } = options;

    let attempt = 0;
    setIsRetrying(true);
    setRetryCount(0);

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        attempt++;
        setRetryCount(attempt);

        if (attempt > maxRetries) {
          setIsRetrying(false);
          throw error;
        }

        const currentError = error as Error;
        onRetryCallback?.(attempt, currentError);

        // Calculate delay with optional exponential backoff
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay;

        console.log(`Operation failed (attempt ${attempt}), retrying in ${delay}ms...`, currentError);

        // Show toast for user feedback
        if (attempt === 1) {
          toast({
            title: "Connection Issue",
            description: "Retrying automatically...",
            variant: "default",
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsRetrying(false);
    throw new Error('Max retries exceeded');
  }, [toast]);

  return {
    executeWithRetry,
    isRetrying,
    retryCount
  };
};

interface SupabaseRetryOptions extends RetryOptions {
  showSuccessToast?: boolean;
  successMessage?: string;
  operation?: string;
}

// Hook for specific Supabase operations
export const useSupabaseRetry = () => {
  const { executeWithRetry, isRetrying, retryCount } = useRetry();
  const { toast } = useToast();

  const executeSupabaseOperation = useCallback(async (
    operation: () => Promise<{ data: any; error: any }>,
    options: SupabaseRetryOptions = {}
  ): Promise<any> => {
    const { showSuccessToast = false, successMessage, operation: operationName, ...retryOptions } = options;

    return executeWithRetry(async () => {
      const { data, error } = await operation();
      
      if (error) {
        console.error(`Supabase operation failed${operationName ? ` (${operationName})` : ''}:`, error);
        
        // Handle specific Supabase error types
        if (error.code === 'PGRST301') {
          throw new Error('Network connection lost. Please check your internet connection.');
        } else if (error.code === '42501') {
          throw new Error('Access denied. Please check your permissions.');
        } else if (error.code === '23505') {
          throw new Error('This record already exists.');
        } else {
          throw new Error(error.message || 'An unexpected error occurred.');
        }
      }

      if (showSuccessToast && successMessage) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }

      return data;
    }, {
      maxRetries: 2,
      retryDelay: 1500,
      exponentialBackoff: true,
      onRetryCallback: (attempt, error) => {
        console.log(`Supabase retry attempt ${attempt} for ${operationName || 'operation'}:`, error.message);
      },
      ...retryOptions
    });
  }, [executeWithRetry, toast]);

  return {
    executeSupabaseOperation,
    isRetrying,
    retryCount
  };
};
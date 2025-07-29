import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

// Function to get the Stripe publishable key from our secure edge function
const getStripeKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-stripe-key');
  
  if (error) {
    console.error('Error fetching Stripe key:', error);
    throw new Error('Failed to get Stripe configuration');
  }
  
  return data.publishableKey;
};

// Initialize Stripe with the publishable key
let stripeInstance: Promise<any> | null = null;

const getStripe = (): Promise<any> => {
  if (!stripeInstance) {
    stripeInstance = getStripeKey().then(key => loadStripe(key));
  }
  return stripeInstance;
};

export const stripePromise = getStripe();
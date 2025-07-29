import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface EmbeddedPaymentFormProps {
  clientSecret: string;
  orderId: string;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({
  clientSecret,
  orderId,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?order_id=${orderId}`,
      },
      redirect: 'if_required'
    });

    if (error) {
      console.error('Payment failed:', error);
      onPaymentError(error.message || 'Payment failed');
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } else {
      console.log('Payment succeeded');
      onPaymentSuccess();
      toast({
        title: "Payment Successful",
        description: "Your order has been placed successfully!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-background">
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isProcessing || !stripe || !elements}
        className="w-full"
        size="lg"
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </form>
  );
};
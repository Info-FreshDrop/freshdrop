import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmbeddedPaymentFormProps {
  clientSecret: string;
  orderId: string; // This is now the payment intent ID
  onPaymentSuccess: (confirmedOrderId: string) => void;
  onPaymentError: (error: string) => void;
  amount?: number; // Amount in cents
}

export const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({
  clientSecret,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  amount,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      console.log('Payment succeeded, confirming order:', paymentIntent.id);
      
      // Call confirm-order-payment function to update order status
      const { data, error } = await supabase.functions.invoke('confirm-order-payment', {
        body: { paymentIntentId: paymentIntent.id }
      });

      if (error) {
        console.error('Error confirming payment:', error);
        toast({
          title: "Payment Confirmation Error",
          description: "Payment succeeded but order confirmation failed. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        console.log('Order confirmed successfully:', data.orderId);
        toast({
          title: "Order Placed Successfully!",
          description: "Your payment has been processed and your order is confirmed.",
        });
        onPaymentSuccess(data.orderId);
      } else {
        throw new Error(data?.message || 'Order confirmation failed');
      }
    } catch (error) {
      console.error('Error in payment success handler:', error);
      toast({
        title: "Payment Confirmation Error",
        description: "Payment succeeded but order confirmation failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
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
    } else if (paymentIntent) {
      console.log('Payment succeeded');
      await handlePaymentSuccess(paymentIntent);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-background">
        <PaymentElement 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isProcessing || !stripe || !elements}
        className="w-full"
        size="lg"
      >
        {isProcessing 
          ? 'Processing...' 
          : amount 
            ? `Pay $${(amount / 100).toFixed(2)}` 
            : 'Complete Payment'
        }
      </Button>
    </form>
  );
};
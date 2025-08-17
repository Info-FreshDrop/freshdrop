import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { 
  CreditCard, 
  Plus,
  Trash2,
  CheckCircle,
  Loader2
} from "lucide-react";

let stripePromise: Promise<any> | null = null;

const initializeStripe = async () => {
  console.log('Initializing Stripe...');
  try {
    const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
    console.log('Edge function response:', { data, error });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    if (data?.publishableKey) {
      console.log('Got publishable key:', data.publishableKey.substring(0, 20) + '...');
      stripePromise = loadStripe(data.publishableKey);
      return stripePromise;
    } else {
      console.error('No publishable key in response:', data);
      throw new Error('No publishable key received');
    }
  } catch (error) {
    console.error('Error getting Stripe key:', error);
    throw error;
  }
};

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  stripe_payment_method_id: string;
  created_at: string;
}

export function PaymentMethods() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  console.log('PaymentMethods component mounted, user:', user?.id);

  useEffect(() => {
    // Initialize Stripe when component mounts
    initializeStripe()
      .then(() => {
        console.log('Stripe initialized successfully');
        setStripeReady(true);
      })
      .catch(error => {
        console.error('Failed to initialize Stripe:', error);
        toast({
          title: "Error",
          description: "Failed to initialize payment system. Please refresh the page.",
          variant: "destructive"
        });
      });
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Loading payment methods for user:', user.id);
      loadPaymentMethods();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      // First, remove default from all other methods
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Then set this method as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default payment method updated"
      });

      loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method",
        variant: "destructive"
      });
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      setDeletingMethod(methodId);
      
      // Note: In a real implementation, you would also need to delete from Stripe
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method deleted"
      });

      loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive"
      });
    } finally {
      setDeletingMethod(null);
    }
  };

  const addPaymentMethod = async (paymentMethodId: string, cardInfo: any) => {
    console.log('addPaymentMethod called with:', { paymentMethodId, cardInfo });
    
    try {
      console.log('Attempting to insert payment method into database...');
      
      const insertData = {
        user_id: user?.id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: cardInfo?.brand || 'unknown',
        card_last4: cardInfo?.last4 || '0000',
        card_exp_month: cardInfo?.exp_month || 12,
        card_exp_year: cardInfo?.exp_year || 2025,
        is_default: paymentMethods.length === 0 // First card becomes default
      };
      
      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Payment method inserted successfully:', data);

      toast({
        title: "Success",
        description: "Payment method added successfully"
      });

      await loadPaymentMethods();
      setShowAddCard(false);
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Error",
        description: `Failed to add payment method: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading payment methods...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saved Payment Methods */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Saved Payment Methods
          </CardTitle>
          <CardDescription>
            Manage your saved cards for faster checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No saved payment methods</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCard(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getBrandIcon(method.card_brand)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {method.card_brand}
                        </span>
                        <span className="text-muted-foreground">
                          •••• {method.card_last4}
                        </span>
                        {method.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {formatExpiryDate(method.card_exp_month, method.card_exp_year)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        className="text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePaymentMethod(method.id)}
                      disabled={deletingMethod === method.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCard(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Security Info */}
      <Card className="border-0 shadow-soft bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Secure Payments</h4>
              <p className="text-sm text-blue-700">
                All payment information is securely processed by Stripe. 
                Your card details are never stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method for faster checkout
            </DialogDescription>
          </DialogHeader>
          
          {stripeReady ? (
            <Elements stripe={stripePromise}>
              <AddCardForm 
                onSuccess={addPaymentMethod}
                onCancel={() => setShowAddCard(false)}
              />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <div className="text-sm text-muted-foreground">Initializing payment system...</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddCardForm({ onSuccess, onCancel }: { 
  onSuccess: (paymentMethodId: string, cardInfo: any) => Promise<void>;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  console.log('AddCardForm mounted, stripe loaded:', !!stripe, 'elements loaded:', !!elements);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.log('Stripe not loaded yet');
      return;
    }

    setLoading(true);
    console.log('Starting payment method creation...');

    const card = elements.getElement(CardElement);
    if (!card) {
      console.log('Card element not found');
      setLoading(false);
      return;
    }

    try {
      console.log('Creating payment method with Stripe...');
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: card,
      });

      if (error) {
        console.error('Stripe error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to process card information",
          variant: "destructive"
        });
        return;
      }

      console.log('Payment method created:', paymentMethod);

      if (paymentMethod) {
        console.log('Calling onSuccess with payment method data...');
        await onSuccess(paymentMethod.id, paymentMethod.card);
      }
    } catch (error) {
      console.error('Error creating payment method:', error);
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement options={cardElementOptions} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Payment Method
        </Button>
      </div>
    </form>
  );
}
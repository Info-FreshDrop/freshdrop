import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Plus,
  Trash2,
  CheckCircle
} from "lucide-react";

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

  useEffect(() => {
    if (user) {
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
          
          <div className="py-4">
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4" />
              <p>Payment method integration with Stripe</p>
              <p className="text-sm">would be implemented here</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCard(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddCard(false)}>
              Add Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
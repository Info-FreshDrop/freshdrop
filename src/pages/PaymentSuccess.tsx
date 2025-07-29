import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setIsVerifying(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      if (data?.success && data?.order_confirmed) {
        setPaymentVerified(true);
        toast({
          title: "Payment Successful!",
          description: "Your order has been confirmed and will be processed soon.",
        });
      } else {
        toast({
          title: "Payment Verification Failed",
          description: "Please contact support if you were charged.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Verification Error",
        description: "Unable to verify payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-0 shadow-soft">
          <CardHeader className="text-center pb-6">
            {paymentVerified ? (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
                <p className="text-muted-foreground">
                  Your laundry order has been confirmed
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-700">Payment Issue</CardTitle>
                <p className="text-muted-foreground">
                  There was a problem verifying your payment
                </p>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {paymentVerified ? (
              <>
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    What happens next?
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Your order is now in the queue for pickup</li>
                    <li>• A washer will be assigned to collect your laundry</li>
                    <li>• You'll receive updates via email and in the app</li>
                    <li>• Your clean laundry will be delivered the next day</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Button 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Return to Dashboard
                  </Button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You will now be redirected to your dashboard where you can track your order in the "Active Orders" section.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you were charged, please contact our support team with your session ID:
                </p>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                  {sessionId || 'No session ID available'}
                </code>
                <Button onClick={() => navigate('/')} className="w-full">
                  Return to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
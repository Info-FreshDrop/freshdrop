import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface OrderCancellationProps {
  orderId: string;
  orderStatus: string;
  totalAmount: number;
  onCancelled: () => void;
}

export function OrderCancellation({ orderId, orderStatus, totalAmount, onCancelled }: OrderCancellationProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const canCancel = ['placed', 'unclaimed', 'claimed'].includes(orderStatus);

  const handleCancel = async () => {
    if (!canCancel) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: {
          orderId,
          reason: reason.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Order Cancelled",
          description: data.message,
          variant: "default",
        });
        
        setShowDialog(false);
        onCancelled();
      } else {
        throw new Error(data.error || 'Failed to cancel order');
      }
    } catch (error: any) {
      console.error('Cancellation error:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || 'Failed to cancel order. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (orderStatus) {
      case 'placed':
      case 'unclaimed':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          message: "Your order hasn't been picked up yet. You can cancel with a full refund.",
          canRefund: true
        };
      case 'claimed':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          message: "An operator has been assigned. You can still cancel, but please provide a reason.",
          canRefund: true
        };
      case 'picked_up':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          message: "Your laundry has been picked up. Cancellation may not be possible.",
          canRefund: false
        };
      default:
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          message: "This order cannot be cancelled at this stage.",
          canRefund: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (!canCancel) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            {statusInfo.icon}
            Cannot Cancel Order
          </CardTitle>
          <CardDescription>{statusInfo.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            {statusInfo.icon}
            Cancel Order
          </CardTitle>
          <CardDescription>{statusInfo.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setShowDialog(true)}
            className="w-full"
          >
            Cancel Order
          </Button>
          {totalAmount > 0 && statusInfo.canRefund && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Refund of ${(totalAmount / 100).toFixed(2)} will be processed automatically
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
              {totalAmount > 0 && statusInfo.canRefund && (
                <span className="block mt-2 font-medium">
                  A refund of ${(totalAmount / 100).toFixed(2)} will be processed automatically.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label className="text-sm font-medium">Reason for cancellation (optional)</label>
            <Textarea
              placeholder="Please let us know why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
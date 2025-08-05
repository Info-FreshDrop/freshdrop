import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, DollarSign } from "lucide-react";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    washer_id: string;
    total_amount_cents: number;
  };
  operatorName?: string;
}

export function TipModal({ isOpen, onClose, order, operatorName }: TipModalProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const predefinedAmounts = [200, 500, 1000]; // $2, $5, $10 in cents

  const handleTipSubmit = async () => {
    const tipAmount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
    
    if (!tipAmount || tipAmount <= 0) {
      toast.error('Please select or enter a tip amount');
      return;
    }

    setIsLoading(true);
    try {
      // Create tip record
      const { error: tipError } = await supabase
        .from('tips')
        .insert({
          order_id: order.id,
          customer_id: user?.id,
          operator_id: order.washer_id,
          amount_cents: tipAmount,
          message: message || null
        });

      if (tipError) throw tipError;

      // Process with saved payment method (Stripe integration would go here)
      toast.success(`$${(tipAmount / 100).toFixed(2)} tip sent to ${operatorName || 'your operator'}!`);

      onClose();
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
    } catch (error) {
      console.error('Error sending tip:', error);
      toast.error('Failed to send tip');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Send a Tip
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Show appreciation to {operatorName || 'your operator'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick tip amounts */}
          <div>
            <Label className="text-sm font-medium">Quick Amounts</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {predefinedAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  className="h-12"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  {amount / 100}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <Label htmlFor="custom-amount" className="text-sm font-medium">
              Custom Amount
            </Label>
            <Input
              id="custom-amount"
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              step="0.01"
              min="0"
            />
          </div>

          {/* Optional message */}
          <div>
            <Label htmlFor="tip-message" className="text-sm font-medium">
              Message (Optional)
            </Label>
            <Textarea
              id="tip-message"
              placeholder="Say thanks or leave a note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Tip Amount:</span>
              <span className="text-lg font-bold">
                ${((selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0)) / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTipSubmit}
              disabled={isLoading || (!selectedAmount && !customAmount)}
              className="flex-1"
            >
              {isLoading ? 'Sending...' : 'Send Tip'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
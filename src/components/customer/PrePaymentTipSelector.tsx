import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

interface PrePaymentTipSelectorProps {
  subtotal: number;
  onTipChange: (tipCents: number) => void;
  selectedTip: number;
}

export function PrePaymentTipSelector({ subtotal, onTipChange, selectedTip }: PrePaymentTipSelectorProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const tipPercentages = [15, 18, 20, 22];

  const handlePercentageTip = (percentage: number) => {
    const tipAmount = Math.round(subtotal * percentage / 100);
    onTipChange(tipAmount);
    setShowCustom(false);
    setCustomAmount('');
  };

  const handleCustomTip = () => {
    setShowCustom(true);
    onTipChange(0);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const amount = parseFloat(value) || 0;
    const tipCents = Math.round(amount * 100);
    onTipChange(tipCents);
  };

  const handleNoTip = () => {
    onTipChange(0);
    setShowCustom(false);
    setCustomAmount('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Add Tip for Your Operator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Show appreciation for excellent service
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Percentage tip options */}
        <div className="grid grid-cols-4 gap-2">
          {tipPercentages.map((percentage) => {
            const tipAmount = Math.round(subtotal * percentage / 100);
            const isSelected = selectedTip === tipAmount && !showCustom;
            
            return (
              <Button
                key={percentage}
                variant={isSelected ? "default" : "outline"}
                onClick={() => handlePercentageTip(percentage)}
                className="h-16 flex flex-col"
              >
                <span className="text-sm font-medium">{percentage}%</span>
                <span className="text-xs opacity-80">
                  ${(tipAmount / 100).toFixed(2)}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Custom tip and no tip options */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={showCustom ? "default" : "outline"}
            onClick={handleCustomTip}
            className="h-12"
          >
            Custom
          </Button>
          <Button
            variant={selectedTip === 0 && !showCustom ? "default" : "outline"}
            onClick={handleNoTip}
            className="h-12"
          >
            No Tip
          </Button>
        </div>

        {/* Custom amount input */}
        {showCustom && (
          <div className="space-y-2">
            <Label htmlFor="custom-tip">Custom Tip Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="custom-tip"
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="pl-8"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        )}

        {/* Tip summary */}
        {selectedTip > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Tip Amount:</span>
              <span className="font-medium">${(selectedTip / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
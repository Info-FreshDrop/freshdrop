import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Edit,
  Clock,
  Package,
  Plus
} from "lucide-react";

interface WasherPayment {
  id: string;
  user_id: string;
  hourly_rate_cents: number;
  base_pay_per_order_cents: number;
  bonus_pay_per_order_cents: number;
  payment_notes: string | null;
  pay_updated_at: string;
  pay_updated_by: string | null;
  is_active: boolean;
  // Profile data from join
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface PaymentFormData {
  hourly_rate_cents: number;
  base_pay_per_order_cents: number;
  bonus_pay_per_order_cents: number;
  payment_notes: string;
}

export function OperatorPaymentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [washers, setWashers] = useState<WasherPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWasher, setEditingWasher] = useState<WasherPayment | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    hourly_rate_cents: 2000,
    base_pay_per_order_cents: 800,
    bonus_pay_per_order_cents: 0,
    payment_notes: ""
  });

  useEffect(() => {
    loadWashers();
  }, []);

  const loadWashers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          hourly_rate_cents,
          base_pay_per_order_cents,
          bonus_pay_per_order_cents,
          payment_notes,
          pay_updated_at,
          pay_updated_by,
          is_active,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten the profile data
      const flattenedData = data?.map(washer => {
        const profile = Array.isArray(washer.profiles) ? washer.profiles[0] : washer.profiles;
        return {
          ...washer,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          email: profile?.email
        };
      }) || [];

      setWashers(flattenedData);
    } catch (error) {
      console.error('Error loading washers:', error);
      toast({
        title: "Error",
        description: "Failed to load operator payment information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (washer: WasherPayment) => {
    setEditingWasher(washer);
    setFormData({
      hourly_rate_cents: washer.hourly_rate_cents,
      base_pay_per_order_cents: washer.base_pay_per_order_cents,
      bonus_pay_per_order_cents: washer.bonus_pay_per_order_cents,
      payment_notes: washer.payment_notes || ""
    });
  };

  const handleSavePayment = async () => {
    if (!editingWasher || !user) return;

    try {
      const { error } = await supabase
        .from('washers')
        .update({
          ...formData,
          pay_updated_at: new Date().toISOString(),
          pay_updated_by: user.id
        })
        .eq('id', editingWasher.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Operator payment updated successfully"
      });

      setEditingWasher(null);
      loadWashers();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment information",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getOperatorName = (washer: WasherPayment) => {
    if (washer.first_name && washer.last_name) {
      return `${washer.first_name} ${washer.last_name}`;
    }
    return washer.email || "Unknown Operator";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading operator payments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Operator Payment Management
          </CardTitle>
          <CardDescription>
            Manage hourly rates and per-order compensation for all operators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {washers.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active operators found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {washers.map((washer) => (
                <div
                  key={washer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{getOperatorName(washer)}</h3>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Hourly:</span>
                        <span className="font-medium">{formatCurrency(washer.hourly_rate_cents)}/hr</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Per Order:</span>
                        <span className="font-medium">{formatCurrency(washer.base_pay_per_order_cents)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Bonus:</span>
                        <span className="font-medium">{formatCurrency(washer.bonus_pay_per_order_cents)}</span>
                      </div>
                    </div>

                    {washer.payment_notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        <strong>Notes:</strong> {washer.payment_notes}
                      </p>
                    )}
                    
                    {washer.pay_updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(washer.pay_updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPayment(washer)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Payment
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingWasher} onOpenChange={() => setEditingWasher(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Payment for {editingWasher && getOperatorName(editingWasher)}</DialogTitle>
            <DialogDescription>
              Update the payment structure for this operator. All amounts are in USD.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    value={(formData.hourly_rate_cents / 100).toFixed(2)}
                    onChange={(e) => 
                      setFormData({
                        ...formData, 
                        hourly_rate_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per hour worked</p>
              </div>
              
              <div>
                <Label htmlFor="base_pay">Base Pay per Order</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="base_pay"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    value={(formData.base_pay_per_order_cents / 100).toFixed(2)}
                    onChange={(e) => 
                      setFormData({
                        ...formData, 
                        base_pay_per_order_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per completed order</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="bonus_pay">Bonus Pay per Order</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="bonus_pay"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8"
                  value={(formData.bonus_pay_per_order_cents / 100).toFixed(2)}
                  onChange={(e) => 
                    setFormData({
                      ...formData, 
                      bonus_pay_per_order_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Additional bonus compensation</p>
            </div>
            
            <div>
              <Label htmlFor="payment_notes">Payment Notes</Label>
              <Textarea
                id="payment_notes"
                placeholder="Add any special payment terms or notes..."
                value={formData.payment_notes}
                onChange={(e) => 
                  setFormData({...formData, payment_notes: e.target.value})
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">Internal notes about this operator's payment arrangement</p>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Payment Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Hourly Rate:</span>
                  <span className="font-medium">{formatCurrency(formData.hourly_rate_cents)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Base per Order:</span>
                  <span className="font-medium">{formatCurrency(formData.base_pay_per_order_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus per Order:</span>
                  <span className="font-medium">{formatCurrency(formData.bonus_pay_per_order_cents)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total per Order:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(formData.base_pay_per_order_cents + formData.bonus_pay_per_order_cents)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWasher(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
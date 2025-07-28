import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wallet, 
  CreditCard, 
  Plus, 
  History, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Gift
} from "lucide-react";

interface WalletData {
  balance_cents: number;
  transactions: Array<{
    id: string;
    transaction_type: string;
    amount_cents: number;
    description: string;
    created_at: string;
  }>;
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
}

export function WalletInterface() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
      loadPaymentMethods();
    }
  }, [user]);

  const loadWalletData = async () => {
    try {
      // Get or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user?.id })
          .select()
          .single();
        
        if (createError) throw createError;
        walletData = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setWallet({
        balance_cents: walletData.balance_cents,
        transactions: transactions || []
      });

    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet information');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      // Here you would integrate with Stripe to process the payment
      // For now, we'll simulate a successful deposit
      const amountCents = Math.round(parseFloat(depositAmount) * 100);
      
      // In a real implementation, you'd call your Stripe edge function here
      toast.success(`$${depositAmount} added to your wallet!`);
      setDepositAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Error depositing funds:', error);
      toast.error('Failed to deposit funds');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'tip':
        return <Gift className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600';
      case 'withdrawal':
      case 'tip':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!wallet) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <Card className="border-0 shadow-soft bg-gradient-primary text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            FreshDrop Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            ${(wallet.balance_cents / 100).toFixed(2)}
          </div>
          <p className="text-white/80 text-sm">Available Balance</p>
        </CardContent>
      </Card>

      {/* Add Funds */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleDeposit}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? 'Adding...' : 'Add Funds'}
            </Button>
          </div>
          
          {/* Quick amounts */}
          <div className="flex gap-2">
            {['10', '25', '50', '100'].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setDepositAmount(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Saved Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-4">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No saved payment methods</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setShowAddCard(true)}
              >
                Add Payment Method
              </Button>
            </div>
          ) : (
            <>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">
                        {method.card_brand} •••• {method.card_last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.card_exp_month}/{method.card_exp_year}
                      </p>
                    </div>
                  </div>
                  {method.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddCard(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wallet.transactions.length === 0 ? (
            <div className="text-center py-4">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallet.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right ${getTransactionColor(transaction.transaction_type)}`}>
                    <p className="font-medium">
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}
                      ${Math.abs(transaction.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
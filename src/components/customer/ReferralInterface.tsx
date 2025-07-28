import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Share2, 
  Copy, 
  Users, 
  Gift, 
  DollarSign,
  Trophy,
  Mail,
  MessageCircle
} from "lucide-react";

interface ReferralData {
  code: string;
  usage_count: number;
  reward_amount_cents: number;
  referralUses: Array<{
    id: string;
    referred_user_id: string;
    reward_given_cents: number;
    created_at: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  }>;
}

export function ReferralInterface() {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    try {
      // Get or create referral code
      let { data: referralCode, error: referralError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (referralError && referralError.code === 'PGRST116') {
        // Create referral code if it doesn't exist
        const newCode = `FRESH${user?.id?.slice(0, 8).toUpperCase()}`;
        const { data: newReferral, error: createError } = await supabase
          .from('referral_codes')
          .insert({
            user_id: user?.id,
            code: newCode,
            reward_amount_cents: 500 // $5 default
          })
          .select()
          .single();
        
        if (createError) throw createError;
        referralCode = newReferral;
      } else if (referralError) {
        throw referralError;
      }

      // Get referral uses
      const { data: referralUses } = await supabase
        .from('referral_uses')
        .select('*')
        .eq('referrer_user_id', user?.id)
        .order('created_at', { ascending: false });

      // Get profile data for referred users
      const referralUsesWithProfiles = [];
      if (referralUses) {
        for (const use of referralUses) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', use.referred_user_id)
            .single();
          
          referralUsesWithProfiles.push({
            ...use,
            profiles: profile
          });
        }
      }

      setReferralData({
        code: referralCode.code,
        usage_count: referralCode.usage_count,
        reward_amount_cents: referralCode.reward_amount_cents,
        referralUses: referralUsesWithProfiles
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral information');
    }
  };

  const copyReferralCode = async () => {
    if (!referralData) return;
    
    try {
      await navigator.clipboard.writeText(referralData.code);
      toast.success('Referral code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy referral code');
    }
  };

  const shareReferralLink = () => {
    if (!referralData) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.code}`;
    const text = `Hey! I've been using FreshDrop for my laundry and it's amazing! Use my referral code "${referralData.code}" and we both get $${(referralData.reward_amount_cents / 100).toFixed(2)} off our next order! Sign up here: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join FreshDrop Laundry Service',
        text: text,
        url: referralLink
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Referral message copied to clipboard!');
    }
  };

  const sendEmailInvite = async () => {
    if (!emailAddress || !referralData) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Here you would integrate with an email service
      // For now, we'll just show a success message
      toast.success(`Invitation sent to ${emailAddress}!`);
      setEmailAddress('');
    } catch (error) {
      console.error('Error sending email invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!referralData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading referral information...</p>
        </div>
      </div>
    );
  }

  const totalEarnings = referralData.referralUses.reduce(
    (sum, use) => sum + use.reward_given_cents,
    0
  );

  return (
    <div className="space-y-6">
      {/* Referral Overview */}
      <Card className="border-0 shadow-soft bg-gradient-primary text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Your Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{referralData.code}</div>
            <p className="text-white/80 text-sm">Your Referral Code</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyReferralCode}
              className="mt-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">{referralData.usage_count}</div>
              <p className="text-white/80 text-sm">Friends Referred</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${(totalEarnings / 100).toFixed(2)}</div>
              <p className="text-white/80 text-sm">Total Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            How Referrals Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Share Your Code</h3>
              <p className="text-sm text-muted-foreground">
                Share your unique referral code with friends and family
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Friends Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                They use your code when placing their first order
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Both Get Rewards</h3>
              <p className="text-sm text-muted-foreground">
                You both get ${(referralData.reward_amount_cents / 100).toFixed(2)} off your next order!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Options */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Invite Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Invitation */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter friend's email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={sendEmailInvite}
              disabled={isLoading}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
          </div>

          {/* Share Button */}
          <Button
            variant="outline"
            onClick={shareReferralLink}
            className="w-full"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Share via Message
          </Button>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Referral History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralData.referralUses.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground">
                Start sharing your code to earn rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referralData.referralUses.map((use) => (
                <div
                  key={use.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {use.profiles?.first_name} {use.profiles?.last_name || 'New User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(use.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    +${(use.reward_given_cents / 100).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trash2, AlertTriangle, Download, Shield, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDeletionModal({ isOpen, onClose }: AccountDeletionModalProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState("");
  const [requestDataExport, setRequestDataExport] = useState(false);
  const [understandConsequences, setUnderstandConsequences] = useState(false);

  const handleRequestDeletion = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('request-account-deletion', {
        body: {
          reason,
          requestDataExport
        }
      });

      if (error) throw error;

      toast({
        title: "Account Deletion Requested",
        description: "Your account has been disabled and scheduled for deletion. You will be logged out shortly.",
      });

      // Close modal and sign out immediately
      onClose();
      setTimeout(async () => {
        await signOut();
      }, 1500);
      
      setStep(1);
      setConfirmationText("");
      setReason("");
      setRequestDataExport(false);
      setUnderstandConsequences(false);
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      toast({
        title: "Request Failed",
        description: "Failed to submit deletion request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToStep2 = understandConsequences;
  const canProceedToStep3 = confirmationText.toLowerCase() === "delete my account";

  const resetModal = () => {
    setStep(1);
    setConfirmationText("");
    setReason("");
    setRequestDataExport(false);
    setUnderstandConsequences(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>Warning:</strong> Account deletion is permanent and cannot be undone.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  What will happen to your data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <span><strong>Personal Information:</strong> Your profile, contact details, and preferences will be permanently deleted.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <span><strong>Order History:</strong> Your order history will be anonymized but retained for business records and tax purposes.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <span><strong>Payment Methods:</strong> All stored payment methods will be removed from our systems.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <span><strong>Account Access:</strong> You will no longer be able to access your account or use our services.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong>Active Orders:</strong> Any active orders must be completed or cancelled before deletion.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Deletion Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>7-day waiting period:</strong> Your account will be scheduled for deletion in 7 days.</p>
                <p><strong>Cancellation:</strong> You can cancel the deletion request during this period.</p>
                <p><strong>Final deletion:</strong> After 7 days, the deletion will be processed and cannot be reversed.</p>
              </CardContent>
            </Card>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="understand-consequences"
                checked={understandConsequences}
                onCheckedChange={(checked) => setUnderstandConsequences(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="understand-consequences" className="text-sm leading-5 cursor-pointer">
                I understand the consequences of deleting my account and that this action cannot be undone.
              </Label>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Before you go...</h3>
              <p className="text-sm text-muted-foreground">
                Help us improve by letting us know why you're leaving (optional)
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for leaving (optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you're deleting your account..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="request-export"
                  checked={requestDataExport}
                  onCheckedChange={(checked) => setRequestDataExport(checked as boolean)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="request-export" className="text-sm font-medium cursor-pointer">
                    Request data export before deletion
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll email you a copy of your personal data before deletion.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Alert className="border-destructive bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>Final Step:</strong> This is your last chance to cancel.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <p className="text-sm">
                To confirm account deletion, please type <strong>"delete my account"</strong> in the field below:
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmation Text</Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type: delete my account"
                  className="font-mono"
                />
              </div>

              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Remember:</strong> {requestDataExport ? 
                    "Your data export will be emailed to you within 24 hours." : 
                    "You have not requested a data export. Your data will be permanently deleted."
                  }
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRequestDeletion}
                disabled={!canProceedToStep3 || isLoading}
              >
                {isLoading ? "Processing..." : "Delete My Account"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
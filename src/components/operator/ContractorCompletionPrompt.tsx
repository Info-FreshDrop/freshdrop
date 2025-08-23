import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { User, FileText, CreditCard, CheckCircle, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ContractorCompletionPromptProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface ContractorData {
  business_name: string;
  tax_id: string;
  tax_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
  };
  bank_account: {
    routing_number: string;
    account_number: string;
    account_type: string;
  };
  w9_agreement: boolean;
  contractor_agreement: boolean;
  is_contractor: boolean;
}

export const ContractorCompletionPrompt = ({ isOpen, onComplete }: ContractorCompletionPromptProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("business");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [contractorData, setContractorData] = useState<ContractorData>({
    business_name: "",
    tax_id: "",
    tax_address: {
      street: "",
      city: "",
      state: "",
      zip_code: "",
    },
    bank_account: {
      routing_number: "",
      account_number: "",
      account_type: "checking",
    },
    w9_agreement: false,
    contractor_agreement: false,
    is_contractor: true,
  });

  useEffect(() => {
    if (user && isOpen) {
      loadExistingData();
    }
  }, [user, isOpen]);

  const loadExistingData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, tax_id, tax_address, w9_completed, is_contractor')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data: washer } = await supabase
        .from('washers')
        .select('bank_account_info')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setContractorData(prev => ({
          ...prev,
          business_name: profile.business_name || "",
          tax_id: profile.tax_id || "",
          tax_address: (profile.tax_address && typeof profile.tax_address === 'object' && !Array.isArray(profile.tax_address)) 
            ? profile.tax_address as any
            : prev.tax_address,
          w9_agreement: profile.w9_completed || false,
          is_contractor: profile.is_contractor || false,
        }));
      }

      if (washer?.bank_account_info) {
        setContractorData(prev => ({
          ...prev,
          bank_account: (washer.bank_account_info && typeof washer.bank_account_info === 'object' && !Array.isArray(washer.bank_account_info))
            ? washer.bank_account_info as any
            : prev.bank_account,
        }));
      }
    } catch (error) {
      console.error('Error loading contractor data:', error);
    }
  };

  const updateField = (field: string, value: any) => {
    setContractorData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedField = (parent: string, field: string, value: string) => {
    setContractorData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof ContractorData] as any,
        [field]: value
      }
    }));
  };

  const getCompletionPercentage = () => {
    const checks = [
      contractorData.tax_id,
      contractorData.tax_address.street,
      contractorData.tax_address.city,
      contractorData.tax_address.state,
      contractorData.tax_address.zip_code,
      contractorData.bank_account.routing_number,
      contractorData.bank_account.account_number,
      contractorData.w9_agreement,
      contractorData.contractor_agreement,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  const validateTab = (tab: string) => {
    switch (tab) {
      case "business":
        return contractorData.tax_id && contractorData.tax_address.street && 
               contractorData.tax_address.city && contractorData.tax_address.state && 
               contractorData.tax_address.zip_code;
      case "banking":
        return contractorData.bank_account.routing_number && contractorData.bank_account.account_number;
      case "agreements":
        return contractorData.w9_agreement && contractorData.contractor_agreement;
      default:
        return false;
    }
  };

  const submitContractorInfo = async () => {
    if (!validateTab("agreements")) {
      toast({
        title: "Incomplete Information",
        description: "Please complete all required fields and agreements",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile with contractor information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: contractorData.business_name || null,
          tax_id: contractorData.tax_id,
          tax_address: contractorData.tax_address,
          w9_completed: contractorData.w9_agreement,
          is_contractor: true,
          contractor_start_date: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      // Update washer with banking information
      const { error: washerError } = await supabase
        .from('washers')
        .update({
          bank_account_info: contractorData.bank_account,
          ach_verified: false, // Will be verified separately
        })
        .eq('user_id', user?.id);

      if (washerError) throw washerError;

      toast({
        title: "Contractor Setup Complete!",
        description: "Your tax and banking information has been saved. You're all set to start earning!",
      });

      onComplete();
    } catch (error) {
      console.error('Error saving contractor info:', error);
      toast({
        title: "Error",
        description: "Failed to save contractor information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Complete Your Contractor Setup
          </DialogTitle>
          <DialogDescription>
            Complete your tax and banking information to start receiving payments as a 1099 contractor
          </DialogDescription>
          <Progress value={getCompletionPercentage()} className="w-full h-2 mt-2" />
          <div className="text-sm text-muted-foreground">
            {getCompletionPercentage()}% complete
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="business" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Tax Info
            </TabsTrigger>
            <TabsTrigger value="banking" disabled={!validateTab("business")} className="text-xs">
              <CreditCard className="w-3 h-3 mr-1" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="agreements" disabled={!validateTab("banking")} className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Agreements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax Information (W-9)</CardTitle>
                <CardDescription>
                  This information is required for 1099 tax reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Optional)</Label>
                  <Input
                    id="business_name"
                    value={contractorData.business_name}
                    onChange={(e) => updateField("business_name", e.target.value)}
                    placeholder="Leave blank for individual contractor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID (SSN or EIN) *</Label>
                  <Input
                    id="tax_id"
                    value={contractorData.tax_id}
                    onChange={(e) => updateField("tax_id", e.target.value)}
                    placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Tax Address *</Label>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="Street Address *"
                      value={contractorData.tax_address.street}
                      onChange={(e) => updateNestedField("tax_address", "street", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="City *"
                      value={contractorData.tax_address.city}
                      onChange={(e) => updateNestedField("tax_address", "city", e.target.value)}
                    />
                    <Input
                      placeholder="State *"
                      value={contractorData.tax_address.state}
                      onChange={(e) => updateNestedField("tax_address", "state", e.target.value)}
                      maxLength={2}
                    />
                  </div>

                  <Input
                    placeholder="ZIP Code *"
                    value={contractorData.tax_address.zip_code}
                    onChange={(e) => updateNestedField("tax_address", "zip_code", e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setActiveTab("banking")}
                    disabled={!validateTab("business")}
                  >
                    Next: Banking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Banking Information</CardTitle>
                <CardDescription>
                  Bank account details for direct deposit payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="routing_number">Routing Number *</Label>
                  <Input
                    id="routing_number"
                    value={contractorData.bank_account.routing_number}
                    onChange={(e) => updateNestedField("bank_account", "routing_number", e.target.value)}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number *</Label>
                  <Input
                    id="account_number"
                    value={contractorData.bank_account.account_number}
                    onChange={(e) => updateNestedField("bank_account", "account_number", e.target.value)}
                    placeholder="Account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                  <select 
                    id="account_type"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={contractorData.bank_account.account_type}
                    onChange={(e) => updateNestedField("bank_account", "account_type", e.target.value)}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("business")}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("agreements")}
                    disabled={!validateTab("banking")}
                  >
                    Next: Agreements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agreements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Legal Agreements</CardTitle>
                <CardDescription>
                  Required agreements for contractor relationship
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="w9_agreement"
                      checked={contractorData.w9_agreement}
                      onCheckedChange={(checked) => updateField("w9_agreement", checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="w9_agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        W-9 Form Completion *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I certify that the tax information provided is accurate and complete. I understand this information will be used for 1099 tax reporting.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="contractor_agreement"
                      checked={contractorData.contractor_agreement}
                      onCheckedChange={(checked) => updateField("contractor_agreement", checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="contractor_agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Independent Contractor Agreement *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I agree to work as an independent contractor, understand I am responsible for my own taxes, and acknowledge the terms of service for weekly payouts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("banking")}>
                    Back
                  </Button>
                  <Button 
                    onClick={submitContractorInfo}
                    disabled={loading || !validateTab("agreements")}
                  >
                    {loading ? "Completing Setup..." : "Complete Setup"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from "react";
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
import { User, FileText, CreditCard, CheckCircle } from "lucide-react";

interface ContractorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContractorData {
  email: string;
  first_name: string;
  last_name: string;
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
}

export const ContractorOnboardingModal = ({ isOpen, onClose, onSuccess }: ContractorOnboardingModalProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [contractorData, setContractorData] = useState<ContractorData>({
    email: "",
    first_name: "",
    last_name: "",
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
  });

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

  const validateTab = (tab: string) => {
    switch (tab) {
      case "personal":
        return contractorData.email && contractorData.first_name && contractorData.last_name;
      case "tax":
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

  const canProceed = (tab: string) => {
    const tabs = ["personal", "tax", "banking", "agreements"];
    const currentIndex = tabs.indexOf(tab);
    return currentIndex === 0 || validateTab(tabs[currentIndex - 1]);
  };

  const submitContractor = async () => {
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
      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: contractorData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: true,
        user_metadata: {
          first_name: contractorData.first_name,
          last_name: contractorData.last_name,
        },
      });

      if (authError) throw authError;
      
      if (!authData.user) throw new Error("Failed to create user");

      // Update the profile with contractor information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: contractorData.business_name,
          tax_id: contractorData.tax_id,
          tax_address: contractorData.tax_address,
          w9_completed: true,
          is_contractor: true,
          contractor_start_date: new Date().toISOString(),
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // Add contractor role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'operator',
        });

      if (roleError) throw roleError;

      // Create washer profile
      const { error: washerError } = await supabase
        .from('washers')
        .insert({
          user_id: authData.user.id,
          is_active: true,
          approval_status: 'approved',
          zip_codes: [], // Will be set later
          bank_account_info: contractorData.bank_account,
          ach_verified: false, // Will be verified separately
        });

      if (washerError) throw washerError;

      toast({
        title: "Success",
        description: `Contractor ${contractorData.first_name} ${contractorData.last_name} has been onboarded successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error onboarding contractor:', error);
      toast({
        title: "Error",
        description: "Failed to onboard contractor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContractorData({
      email: "",
      first_name: "",
      last_name: "",
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
    });
    setActiveTab("personal");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard New 1099 Contractor</DialogTitle>
          <DialogDescription>
            Complete the contractor onboarding process for tax compliance and payroll setup
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="tax" disabled={!canProceed("tax")} className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Tax Info
            </TabsTrigger>
            <TabsTrigger value="banking" disabled={!canProceed("banking")} className="text-xs">
              <CreditCard className="w-3 h-3 mr-1" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="agreements" disabled={!canProceed("agreements")} className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Agreements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>
                  Basic contractor information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={contractorData.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={contractorData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contractorData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Optional)</Label>
                  <Input
                    id="business_name"
                    value={contractorData.business_name}
                    onChange={(e) => updateField("business_name", e.target.value)}
                    placeholder="Leave blank for individual contractor"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setActiveTab("tax")}
                    disabled={!validateTab("personal")}
                  >
                    Next: Tax Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax Information</CardTitle>
                <CardDescription>
                  W-9 information required for 1099 reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label className="text-base font-medium">Tax Address</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax_street">Street Address *</Label>
                    <Input
                      id="tax_street"
                      value={contractorData.tax_address.street}
                      onChange={(e) => updateNestedField("tax_address", "street", e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax_city">City *</Label>
                      <Input
                        id="tax_city"
                        value={contractorData.tax_address.city}
                        onChange={(e) => updateNestedField("tax_address", "city", e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_state">State *</Label>
                      <Input
                        id="tax_state"
                        value={contractorData.tax_address.state}
                        onChange={(e) => updateNestedField("tax_address", "state", e.target.value)}
                        placeholder="NY"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_zip">ZIP Code *</Label>
                    <Input
                      id="tax_zip"
                      value={contractorData.tax_address.zip_code}
                      onChange={(e) => updateNestedField("tax_address", "zip_code", e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("personal")}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("banking")}
                    disabled={!validateTab("tax")}
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
                  Bank account details for ACH transfers
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
                  <Button variant="outline" onClick={() => setActiveTab("tax")}>
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
                    onClick={submitContractor}
                    disabled={loading || !validateTab("agreements")}
                  >
                    {loading ? "Creating Contractor..." : "Complete Onboarding"}
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
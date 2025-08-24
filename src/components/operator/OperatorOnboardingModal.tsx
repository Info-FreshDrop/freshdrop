import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, User, CreditCard, Shield } from 'lucide-react';

interface OperatorOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function OperatorOnboardingModal({ isOpen, onComplete }: OperatorOnboardingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    businessName: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [agreementsData, setAgreementsData] = useState({
    termsAccepted: false,
    privacyAccepted: false,
    backgroundCheckConsent: false,
    taxDocumentConsent: false
  });

  const [w9FileUrl, setW9FileUrl] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Welcome", icon: User },
    { id: 2, title: "Security", icon: Shield },
    { id: 3, title: "Profile", icon: FileText },
    { id: 4, title: "Tax Documents", icon: CreditCard },
    { id: 5, title: "Agreements", icon: CheckCircle }
  ];

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return false;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      
      toast.success("Password updated successfully");
      return true;
    } catch (error) {
      console.error('Password update error:', error);
      toast.error("Failed to update password");
      return false;
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: profileData.businessName,
          tax_id: profileData.taxId,
          phone: profileData.phone,
          tax_address: {
            address: profileData.address,
            city: profileData.city,
            state: profileData.state,
            zip_code: profileData.zipCode,
            emergency_contact: profileData.emergencyContact,
            emergency_phone: profileData.emergencyPhone
          },
          is_contractor: true
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error("Failed to update profile");
      return false;
    }
  };

  const handleW9Upload = async (file: File) => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/w9.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setW9FileUrl(publicUrl);

      // Update profile with W9 information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          w9_file_url: publicUrl,
          w9_completed: true
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success("W-9 form uploaded successfully");
    } catch (error) {
      console.error('W9 upload error:', error);
      toast.error("Failed to upload W-9 form");
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Final validation
      const allAgreementsAccepted = Object.values(agreementsData).every(Boolean);
      if (!allAgreementsAccepted) {
        toast.error("Please accept all required agreements");
        return;
      }

      if (!w9FileUrl) {
        toast.error("Please upload your W-9 form");
        return;
      }

      // Complete onboarding
      const { error } = await supabase.auth.updateUser({
        data: { needs_onboarding: false }
      });

      if (error) throw error;

      toast.success("🎉 Onboarding completed! Welcome to FreshDrop!");
      onComplete();
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    let canProceed = true;

    if (currentStep === 2) {
      canProceed = await handlePasswordUpdate();
    } else if (currentStep === 3) {
      canProceed = await handleProfileUpdate();
    }

    if (canProceed && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 5) {
      await handleComplete();
    }
  };

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to FreshDrop! 🎉
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Let's get you set up as a FreshDrop operator
          </p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full mb-2
                    ${isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-primary text-white' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Welcome to FreshDrop!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <p className="text-lg">
                    Congratulations! Your operator application has been approved.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">What you'll complete:</h3>
                    <ul className="text-sm space-y-1 text-left">
                      <li>• Update your password for security</li>
                      <li>• Complete your contractor profile</li>
                      <li>• Upload required tax documentation (W-9)</li>
                      <li>• Review and accept operator agreements</li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This process should take about 5-10 minutes to complete.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Password Update */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Update Your Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  For security, please update your password from the temporary one sent in your approval email.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password (Your Phone Number)</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter your new password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Profile Information */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contractor Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business/DBA Name</Label>
                    <Input
                      id="businessName"
                      value={profileData.businessName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Your business name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="taxId">Tax ID/SSN</Label>
                    <Input
                      id="taxId"
                      value={profileData.taxId}
                      onChange={(e) => setProfileData(prev => ({ ...prev, taxId: e.target.value }))}
                      placeholder="XXX-XX-XXXX"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileData.city}
                      onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={profileData.zipCode}
                      onChange={(e) => setProfileData(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="ZIP"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      value={profileData.emergencyContact}
                      onChange={(e) => setProfileData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      placeholder="Emergency contact"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={profileData.emergencyPhone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                      placeholder="Emergency phone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Tax Documents */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Tax Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">W-9 Form Required</h3>
                  <p className="text-sm">
                    As an independent contractor, you need to provide a completed W-9 form for tax reporting purposes.
                  </p>
                </div>
                
                <div>
                  <Label>Upload W-9 Form</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleW9Upload(file);
                    }}
                  />
                  {w9FileUrl && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">W-9 Form Uploaded Successfully</Badge>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Need a W-9 form? <a href="/forms/fw9.pdf" target="_blank" className="text-primary hover:underline">Download blank W-9 form here</a></p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Agreements */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Final Agreements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="termsAccepted"
                      checked={agreementsData.termsAccepted}
                      onCheckedChange={(checked) => 
                        setAgreementsData(prev => ({ ...prev, termsAccepted: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="termsAccepted" className="text-sm">
                      I agree to the <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a> and operator guidelines
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacyAccepted"
                      checked={agreementsData.privacyAccepted}
                      onCheckedChange={(checked) => 
                        setAgreementsData(prev => ({ ...prev, privacyAccepted: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="privacyAccepted" className="text-sm">
                      I agree to the <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="backgroundCheckConsent"
                      checked={agreementsData.backgroundCheckConsent}
                      onCheckedChange={(checked) => 
                        setAgreementsData(prev => ({ ...prev, backgroundCheckConsent: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="backgroundCheckConsent" className="text-sm">
                      I consent to background verification as required for operator status
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="taxDocumentConsent"
                      checked={agreementsData.taxDocumentConsent}
                      onCheckedChange={(checked) => 
                        setAgreementsData(prev => ({ ...prev, taxDocumentConsent: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="taxDocumentConsent" className="text-sm">
                      I understand that tax documents (1099-NEC) will be generated based on my earnings
                    </Label>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">🎉 Almost Done!</h3>
                  <p className="text-sm">
                    Once you complete onboarding, you'll be able to start receiving order notifications and earning money as a FreshDrop operator.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          <Button 
            onClick={nextStep}
            disabled={loading}
          >
            {loading ? 'Processing...' : currentStep === 5 ? 'Complete Onboarding' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
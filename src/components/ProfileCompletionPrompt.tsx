import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, CheckCircle2, User, Phone, Mail, Calendar, Settings, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Profile {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  email?: string;
  birthday?: string;
  opt_in_sms?: boolean;
  opt_in_email?: boolean;
}

interface ProfileCompletionPromptProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProfileCompletionPrompt({ isOpen, onComplete, onSkip }: ProfileCompletionPromptProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: '',
    email: '',
    birthday: '',
    opt_in_sms: false,
    opt_in_email: false
  });

  useEffect(() => {
    if (user && isOpen) {
      loadExistingProfile();
    }
  }, [user, isOpen]);

  const loadExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          email: data.email || '',
          birthday: data.birthday || '',
          opt_in_sms: data.opt_in_sms || false,
          opt_in_email: data.opt_in_email || false
        });
      } else {
        // Initialize with user metadata if available
        setProfile(prev => ({
          ...prev,
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          phone: user?.user_metadata?.phone || '',
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const getCompletionPercentage = () => {
    const fields = ['first_name', 'last_name', 'phone', 'email'];
    const completed = fields.filter(field => profile[field as keyof Profile]?.toString().trim()).length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let result;
      
      if (profile.id) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user?.id,
            ...profile,
          });
      }

      if (result.error) throw result.error;

      toast({
        title: "Profile completed!",
        description: "Welcome to FreshDrop! Your profile has been set up successfully.",
      });
      
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Avatar uploaded!",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = profile.first_name || user?.user_metadata?.first_name || '';
    const last = profile.last_name || user?.user_metadata?.last_name || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return profile.first_name?.trim() && profile.last_name?.trim();
      case 2:
        return profile.phone?.trim() && profile.email?.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onSkip} modal>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Complete Your Profile</DialogTitle>
          <div className="text-center text-muted-foreground text-sm">
            Step {step} of 3 - {getCompletionPercentage()}% Complete
          </div>
          <Progress value={(step / 3) * 100} className="w-full h-2" />
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {step === 1 && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="text-center space-y-2">
                  <User className="h-8 w-8 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Let's start with your name so we can personalize your experience
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                      <Camera className="h-4 w-4" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">Add a profile picture (optional)</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={profile.first_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Enter your first name"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={profile.last_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Enter your last name"
                      className="h-12"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="text-center space-y-2">
                  <Phone className="h-8 w-8 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">
                    We need your contact details for order updates and delivery coordination
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send you SMS updates about your laundry orders
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                        className="pl-10 h-12"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For receipts and important account notifications
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday (Optional)</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="birthday"
                        type="date"
                        value={profile.birthday}
                        onChange={(e) => setProfile(prev => ({ ...prev, birthday: e.target.value }))}
                        className="pl-10 h-12"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll send you special birthday offers and discounts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="text-center space-y-2">
                  <Settings className="h-8 w-8 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Communication Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how you'd like to hear from us about special offers and updates
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="opt-in-email"
                        checked={profile.opt_in_email}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, opt_in_email: checked as boolean }))}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor="opt-in-email" className="text-sm font-medium cursor-pointer">
                          Email promotions and offers
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Get exclusive deals, seasonal promotions, and service updates via email
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="opt-in-sms"
                        checked={profile.opt_in_sms}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, opt_in_sms: checked as boolean }))}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor="opt-in-sms" className="text-sm font-medium cursor-pointer">
                          SMS deals and updates
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Receive flash sales and quick updates via text message
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Privacy protected</p>
                        <p className="text-xs mt-1">
                          You can change these preferences anytime. We never share your information with third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            {step === 1 ? (
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip for now
              </Button>
            ) : (
              <Button variant="outline" onClick={prevStep} className="flex-1">
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {loading ? 'Completing...' : 'Complete Profile'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
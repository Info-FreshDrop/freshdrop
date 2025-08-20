import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, X, LogOut, Mail, Calendar, Settings, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccountDeletionModal } from "@/components/customer/AccountDeletionModal";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: () => void;
}

export function ProfileModal({ isOpen, onClose, onProfileUpdate }: ProfileModalProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [profile, setProfile] = useState({
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
      loadProfile();
    }
  }, [user, isOpen]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setExistingProfileId(data.id);
        setProfile({
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
        // No profile exists yet, initialize with user metadata
        setProfile({
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          phone: user?.user_metadata?.phone || '',
          avatar_url: '',
          email: '',
          birthday: '',
          opt_in_sms: false,
          opt_in_email: false
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let result;
      
      if (existingProfileId) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfileId);
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user?.id,
            ...profile,
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onProfileUpdate?.(); // Refresh profile in parent component
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
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
      
      // Create a proper file path with user ID folder structure
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
        title: "Success",
        description: "Avatar uploaded successfully",
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
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-base sm:text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-primary text-primary-foreground rounded-full p-1.5 sm:p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm">First Name</Label>
              <Input
                id="first_name"
                value={profile.first_name}
                onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Enter first name"
                className="h-10 sm:h-auto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm">Last Name</Label>
              <Input
                id="last_name"
                value={profile.last_name}
                onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Enter last name"
                className="h-10 sm:h-auto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="pl-10 h-10 sm:h-auto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm">Phone Number</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
              className="h-10 sm:h-auto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-sm">Birthday</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="birthday"
                type="date"
                value={profile.birthday}
                onChange={(e) => setProfile(prev => ({ ...prev, birthday: e.target.value }))}
                className="pl-10 h-10 sm:h-auto"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We use your birthday for special promotions and offers
            </p>
          </div>

          {/* Communication Preferences */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Communication Preferences</Label>
            </div>
            
            <div className="space-y-3 pl-0 sm:pl-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="opt-in-email"
                  checked={profile.opt_in_email}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, opt_in_email: checked as boolean }))}
                  className="mt-0.5"
                />
                <Label htmlFor="opt-in-email" className="text-sm leading-5 cursor-pointer">
                  Send me promotional emails about special offers and new services
                </Label>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="opt-in-sms"
                  checked={profile.opt_in_sms}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, opt_in_sms: checked as boolean }))}
                  className="mt-0.5"
                />
                <Label htmlFor="opt-in-sms" className="text-sm leading-5 cursor-pointer">
                  Send me promotional SMS messages about deals and updates
                </Label>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pl-0 sm:pl-6">
              You can change these preferences at any time. We respect your privacy and will never share your information.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-3">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2 border-t border-border">
              <Button 
                variant="outline" 
                onClick={signOut} 
                className="text-destructive hover:text-destructive flex-1 sm:flex-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeletionModal(true)}
                className="text-destructive hover:text-destructive border-destructive flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <AccountDeletionModal 
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
      />
    </Dialog>
  );
}
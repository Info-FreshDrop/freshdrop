import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: () => void;
}

export function ProfileModal({ isOpen, onClose, onProfileUpdate }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: ''
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
          avatar_url: data.avatar_url || ''
        });
      } else {
        // No profile exists yet, initialize with user metadata
        setProfile({
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          phone: user?.user_metadata?.phone || '',
          avatar_url: ''
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
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
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
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={profile.first_name}
                onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={profile.last_name}
                onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
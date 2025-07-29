import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  DollarSign,
  Settings
} from "lucide-react";

interface OperatorProfileProps {
  onBack: () => void;
}

export function OperatorProfile({ onBack }: OperatorProfileProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: ''
  });
  const [businessSettings, setBusinessSettings] = useState({
    business_cut_percentage: 30,
    tip_percentage: 100,
    regular_wash_percentage: 70,
    upsale_percentage: 85,
    clothes_shop_percentage: 60
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBusinessSettings();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information.",
        variant: "destructive",
      });
    }
  };

  const loadBusinessSettings = async () => {
    // For now, use default settings. In a real app, this would come from a database
    setBusinessSettings({
      business_cut_percentage: 30,
      tip_percentage: 100,
      regular_wash_percentage: 70,
      upsale_percentage: 85,
      clothes_shop_percentage: 60
    });
  };

  const updateProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Avatar Uploaded",
        description: "Your profile photo has been updated.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateBusinessSettings = async () => {
    // In a real app, this would update the database
    toast({
      title: "Settings Updated",
      description: "Business settings have been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile photo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>
                    {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                      <Camera className="h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Change Photo'}
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>
              </div>

              {/* Name Fields */}
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

              {/* Contact Information */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={updateProfile}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Business Settings
              </CardTitle>
              <CardDescription>
                Configure your earnings distribution and business cut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Business Cut</p>
                    <p className="text-sm text-muted-foreground">Platform fee percentage</p>
                  </div>
                  <Badge variant="outline">{businessSettings.business_cut_percentage}%</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Tips</p>
                    <p className="text-sm text-muted-foreground">You keep all tips</p>
                  </div>
                  <Badge variant="default">{businessSettings.tip_percentage}%</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Regular Wash Orders</p>
                    <p className="text-sm text-muted-foreground">Your cut from wash & fold</p>
                  </div>
                  <Badge variant="secondary">{businessSettings.regular_wash_percentage}%</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Upsales & Add-ons</p>
                    <p className="text-sm text-muted-foreground">Your cut from premium services</p>
                  </div>
                  <Badge variant="secondary">{businessSettings.upsale_percentage}%</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Clothes Shop Sales</p>
                    <p className="text-sm text-muted-foreground">Your cut from merchandise</p>
                  </div>
                  <Badge variant="secondary">{businessSettings.clothes_shop_percentage}%</Badge>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Earning Example
                </h4>
                <div className="text-sm space-y-1">
                  <p>$35 Wash & Fold Order: <span className="font-medium">You earn ${(35 * businessSettings.regular_wash_percentage / 100).toFixed(2)}</span></p>
                  <p>$5 Express Add-on: <span className="font-medium">You earn ${(5 * businessSettings.upsale_percentage / 100).toFixed(2)}</span></p>
                  <p>$3 Customer Tip: <span className="font-medium">You keep $3.00</span></p>
                </div>
              </div>

              <Button
                onClick={updateBusinessSettings}
                variant="outline"
                className="w-full"
              >
                Contact Support to Modify Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
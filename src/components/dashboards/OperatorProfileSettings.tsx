import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Settings, 
  MapPin, 
  Clock, 
  Save,
  Plus,
  X,
  Calendar
} from "lucide-react";

interface OperatorProfile {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar_url?: string;
}

interface WasherData {
  id: string;
  user_id: string;
  zip_codes: string[];
  availability_schedule: any;
  available_time_slots: string[];
  max_orders_per_day: number;
  service_radius_miles: number;
  is_active: boolean;
}

interface AvailabilitySchedule {
  [key: string]: {
    available: boolean;
    time_slots: string[];
  };
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (6 AM - 12 PM)', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)', icon: '☀️' },
  { value: 'evening', label: 'Evening (6 PM - 10 PM)', icon: '🌆' },
  { value: 'night', label: 'Night (10 PM - 6 AM)', icon: '🌙' }
];

interface OperatorProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function OperatorProfileSettings({ isOpen, onClose, onSave }: OperatorProfileSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<OperatorProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });

  // Washer data
  const [washerData, setWasherData] = useState<WasherData | null>(null);
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [newZipCode, setNewZipCode] = useState('');
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>({});

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (profileData) {
        setProfile(profileData);
      }

      // Load washer data
      const { data: washerData, error: washerError } = await supabase
        .from('washers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (washerError) throw washerError;
      if (washerData) {
        setWasherData(washerData as any);
        setZipCodes(washerData.zip_codes || []);
        
        // Parse availability schedule
        const schedule = (washerData.availability_schedule as any) || {};
        setAvailabilitySchedule(schedule);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profile)
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update washer data if it exists
      if (washerData) {
        const { error: washerError } = await supabase
          .from('washers')
          .update({
            zip_codes: zipCodes,
            availability_schedule: availabilitySchedule,
            max_orders_per_day: washerData.max_orders_per_day,
            service_radius_miles: washerData.service_radius_miles
          })
          .eq('id', washerData.id);

        if (washerError) throw washerError;
      }

      toast({
        title: "Success",
        description: "Profile settings saved successfully"
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addZipCode = () => {
    if (newZipCode && !zipCodes.includes(newZipCode)) {
      setZipCodes([...zipCodes, newZipCode]);
      setNewZipCode('');
    }
  };

  const removeZipCode = (zipCode: string) => {
    setZipCodes(zipCodes.filter(z => z !== zipCode));
  };

  const updateAvailability = (day: string, available: boolean) => {
    setAvailabilitySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available
      }
    }));
  };

  const updateTimeSlots = (day: string, timeSlot: string, checked: boolean) => {
    setAvailabilitySchedule(prev => {
      const currentSlots = prev[day]?.time_slots || [];
      const newSlots = checked 
        ? [...currentSlots, timeSlot]
        : currentSlots.filter(slot => slot !== timeSlot);
      
      return {
        ...prev,
        [day]: {
          ...prev[day],
          time_slots: newSlots
        }
      };
    });
  };

  const getDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operator Profile Settings
          </DialogTitle>
          <DialogDescription>
            Manage your profile information, service areas, and availability schedule
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-3">
              <User className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="service-areas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-3">
              <MapPin className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="hidden sm:inline">Service Areas</span>
                <span className="sm:hidden">Areas</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-3">
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="hidden sm:inline">Availability</span>
                <span className="sm:hidden">Schedule</span>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your basic profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address for notifications"
                  />
                </div>
              </CardContent>
            </Card>

            {washerData && (
              <Card>
                <CardHeader>
                  <CardTitle>Service Settings</CardTitle>
                  <CardDescription>
                    Configure your service preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_orders">Max Orders Per Day</Label>
                      <Input
                        id="max_orders"
                        type="number"
                        min="1"
                        max="20"
                        value={washerData.max_orders_per_day}
                        onChange={(e) => setWasherData(prev => prev ? { 
                          ...prev, 
                          max_orders_per_day: parseInt(e.target.value) || 5 
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service_radius">Service Radius (miles)</Label>
                      <Input
                        id="service_radius"
                        type="number"
                        min="1"
                        max="50"
                        value={washerData.service_radius_miles}
                        onChange={(e) => setWasherData(prev => prev ? { 
                          ...prev, 
                          service_radius_miles: parseInt(e.target.value) || 10 
                        } : null)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Service Areas Tab */}
          <TabsContent value="service-areas" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Areas</CardTitle>
                <CardDescription>
                  Manage the zip codes where you provide service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter zip code"
                    value={newZipCode}
                    onChange={(e) => setNewZipCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addZipCode()}
                  />
                  <Button onClick={addZipCode} disabled={!newZipCode}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Service Areas</Label>
                  <div className="flex flex-wrap gap-2">
                    {zipCodes.map((zipCode) => (
                      <Badge key={zipCode} variant="secondary" className="flex items-center gap-1">
                        {zipCode}
                        <button
                          onClick={() => removeZipCode(zipCode)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {zipCodes.length === 0 && (
                      <p className="text-sm text-muted-foreground">No service areas added yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>
                  Set your available days and time slots for each day
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = availabilitySchedule[day] || { available: false, time_slots: [] };
                  
                  return (
                    <div key={day} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={dayData.available}
                            onCheckedChange={(checked) => updateAvailability(day, checked)}
                          />
                          <Label className="text-base font-medium">
                            {getDayName(day)}
                          </Label>
                        </div>
                        {dayData.available && (
                          <Badge variant="outline">
                            {dayData.time_slots.length} slot{dayData.time_slots.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      {dayData.available && (
                        <div className="ml-6 space-y-2">
                          <Label className="text-sm text-muted-foreground">Available Time Slots</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {TIME_SLOTS.map((timeSlot) => (
                              <div key={timeSlot.value} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`${day}-${timeSlot.value}`}
                                  checked={dayData.time_slots.includes(timeSlot.value)}
                                  onChange={(e) => updateTimeSlots(day, timeSlot.value, e.target.checked)}
                                  className="rounded"
                                />
                                <Label htmlFor={`${day}-${timeSlot.value}`} className="text-sm flex items-center gap-1">
                                  <span>{timeSlot.icon}</span>
                                  {timeSlot.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveProfile} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleSetupProps {
  onComplete: () => void;
}

interface DaySchedule {
  available: boolean;
  time_slots: string[];
}

interface Schedule {
  [key: string]: DaySchedule;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (6AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 6PM)' },
  { value: 'evening', label: 'Evening (6PM - 10PM)' },
  { value: 'night', label: 'Night (10PM - 6AM)' }
];

export const ScheduleSetup: React.FC<ScheduleSetupProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [availableZipCodes, setAvailableZipCodes] = useState<string[]>([]);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState<number>(5);
  const [serviceRadius, setServiceRadius] = useState<number>(10);
  const [schedule, setSchedule] = useState<Schedule>({
    monday: { available: false, time_slots: [] },
    tuesday: { available: false, time_slots: [] },
    wednesday: { available: false, time_slots: [] },
    thursday: { available: false, time_slots: [] },
    friday: { available: false, time_slots: [] },
    saturday: { available: false, time_slots: [] },
    sunday: { available: false, time_slots: [] }
  });

  useEffect(() => {
    loadAvailableZipCodes();
    loadCurrentSettings();
  }, []);

  const loadAvailableZipCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('zip_code')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableZipCodes(data?.map(area => area.zip_code) || []);
    } catch (error) {
      console.error('Error loading zip codes:', error);
    }
  };

  const loadCurrentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('washers')
        .select('availability_schedule, zip_codes, max_orders_per_day, service_radius_miles')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setServiceAreas(data.zip_codes || []);
        setMaxOrdersPerDay(data.max_orders_per_day || 5);
        setServiceRadius(data.service_radius_miles || 10);
        
        if (data.availability_schedule) {
          setSchedule(data.availability_schedule as unknown as Schedule);
        }
      }
    } catch (error) {
      console.error('Error loading current settings:', error);
    }
  };

  const handleDayToggle = (day: string, available: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available,
        time_slots: available ? prev[day].time_slots : []
      }
    }));
  };

  const handleTimeSlotToggle = (day: string, timeSlot: string, checked: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        time_slots: checked
          ? [...prev[day].time_slots, timeSlot]
          : prev[day].time_slots.filter(slot => slot !== timeSlot)
      }
    }));
  };

  const handleZipCodeToggle = (zipCode: string, checked: boolean) => {
    setServiceAreas(prev => 
      checked 
        ? [...prev, zipCode]
        : prev.filter(zip => zip !== zipCode)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (serviceAreas.length === 0) {
      toast({
        title: "Service areas required",
        description: "Please select at least one service area",
        variant: "destructive"
      });
      return;
    }

    const hasAvailableDay = Object.values(schedule).some(day => day.available);
    if (!hasAvailableDay) {
      toast({
        title: "Schedule required",
        description: "Please set your availability for at least one day",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('washers')
        .update({
          availability_schedule: schedule as any,
          zip_codes: serviceAreas,
          max_orders_per_day: maxOrdersPerDay,
          service_radius_miles: serviceRadius
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Schedule saved successfully!",
        description: "Your availability and service areas have been updated."
      });

      onComplete();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Calendar className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Set Your Availability</h2>
        <p className="text-muted-foreground">
          Configure when and where you want to work
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Areas
            </CardTitle>
            <CardDescription>
              Select the zip codes where you want to provide service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableZipCodes.map(zipCode => (
                <div key={zipCode} className="flex items-center space-x-2">
                  <Checkbox
                    id={`zip-${zipCode}`}
                    checked={serviceAreas.includes(zipCode)}
                    onCheckedChange={(checked) => 
                      handleZipCodeToggle(zipCode, checked as boolean)
                    }
                  />
                  <Label htmlFor={`zip-${zipCode}`} className="text-sm">
                    {zipCode}
                  </Label>
                </div>
              ))}
            </div>
            {serviceAreas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceAreas.map(zipCode => (
                  <Badge key={zipCode} variant="secondary">
                    {zipCode}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>
              Set your availability for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.key}`}
                      checked={schedule[day.key]?.available || false}
                      onCheckedChange={(checked) => 
                        handleDayToggle(day.key, checked as boolean)
                      }
                    />
                    <Label htmlFor={`day-${day.key}`} className="font-medium">
                      {day.label}
                    </Label>
                  </div>
                </div>
                
                {schedule[day.key]?.available && (
                  <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIME_SLOTS.map(timeSlot => (
                      <div key={timeSlot.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${day.key}-${timeSlot.value}`}
                          checked={schedule[day.key]?.time_slots?.includes(timeSlot.value) || false}
                          onCheckedChange={(checked) => 
                            handleTimeSlotToggle(day.key, timeSlot.value, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`${day.key}-${timeSlot.value}`} 
                          className="text-sm text-muted-foreground"
                        >
                          {timeSlot.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Preferences</CardTitle>
            <CardDescription>
              Set your daily limits and service radius
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOrders">Max Orders Per Day</Label>
                <Select 
                  value={maxOrdersPerDay.toString()} 
                  onValueChange={(value) => setMaxOrdersPerDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} order{num > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                <Select 
                  value={serviceRadius.toString()} 
                  onValueChange={(value) => setServiceRadius(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map(miles => (
                      <SelectItem key={miles} value={miles.toString()}>
                        {miles} miles
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" disabled={loading}>
            Skip for Now
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
};
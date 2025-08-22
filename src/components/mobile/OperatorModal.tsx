import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Clock, Car, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OperatorModal({ isOpen, onClose }: OperatorModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    driversLicense: '',
    vehicleType: '',
    availability: '',
    motivation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn $15-25/hr",
      description: "Competitive pay with tips"
    },
    {
      icon: Clock,
      title: "Flexible Hours",
      description: "Choose your own schedule"
    },
    {
      icon: Car,
      title: "Use Your Vehicle",
      description: "Car, truck, or van required"
    },
    {
      icon: Briefcase,
      title: "No Experience",
      description: "We'll train you"
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Submitting operator application:', formData);
      const { data, error } = await supabase
        .from('operator_applications')
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            drivers_license: formData.driversLicense,
            vehicle_type: formData.vehicleType,
            availability: formData.availability,
            motivation: formData.motivation,
            experience: '', // Add default empty string for required field
            status: 'pending'
          }
        ]);

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and contact you within 2-3 business days.",
      });

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        driversLicense: '',
        vehicleType: '',
        availability: '',
        motivation: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="ios-title2">Be Your Own Boss</SheetTitle>
          <p className="ios-body text-muted-foreground">Join our network of independent operators</p>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <p className="ios-body text-muted-foreground">
            Join our network of independent operators and start earning money with flexible hours. 
            Perfect for students, part-time workers, or anyone looking for extra income.
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="p-3 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <h3 className="ios-caption1 font-semibold mb-1">{benefit.title}</h3>
                  <p className="ios-caption2 text-muted-foreground">{benefit.description}</p>
                </Card>
              );
            })}
          </div>

          {!showForm ? (
            <Button 
              onClick={() => setShowForm(true)}
              className="w-full"
            >
              Apply Now
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="ios-caption1">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="ios-caption1">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="ios-caption1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="ios-caption1">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address" className="ios-caption1">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city" className="ios-caption1">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="ios-caption1">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="zipCode" className="ios-caption1">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="driversLicense" className="ios-caption1">Driver's License</Label>
                  <Input
                    id="driversLicense"
                    value={formData.driversLicense}
                    onChange={(e) => handleInputChange('driversLicense', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vehicleType" className="ios-caption1">Vehicle Type</Label>
                <Select value={formData.vehicleType} onValueChange={(value) => handleInputChange('vehicleType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="availability" className="ios-caption1">Availability</Label>
                <Select value={formData.availability} onValueChange={(value) => handleInputChange('availability', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mornings">Mornings (7-11 AM)</SelectItem>
                    <SelectItem value="afternoons">Afternoons (11 AM-3 PM)</SelectItem>
                    <SelectItem value="evenings">Evenings (3-7 PM)</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="motivation" className="ios-caption1">Why do you want to be an operator?</Label>
                <Textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  placeholder="Tell us about your motivation..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
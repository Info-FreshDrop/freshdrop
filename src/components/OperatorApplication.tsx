import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Car, Clock, DollarSign } from "lucide-react";

export function OperatorApplication() {
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
    experience: '',
    motivation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save application to database
      const { error } = await supabase
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
            experience: formData.experience,
            motivation: formData.motivation,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest! We'll review your application and contact you within 2-3 business days.",
      });

      // Reset form
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
        experience: '',
        motivation: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="operator-application" className="py-20 px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Be Your Own Boss
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join our network of independent operators and start earning money with flexible hours.
            Perfect for students, part-time workers, or anyone looking for extra income.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center p-6">
            <DollarSign className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Earn $15-25/hr</h3>
            <p className="text-sm text-muted-foreground">Competitive pay with tips</p>
          </Card>
          <Card className="text-center p-6">
            <Clock className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Flexible Hours</h3>
            <p className="text-sm text-muted-foreground">Choose your own schedule</p>
          </Card>
          <Card className="text-center p-6">
            <Car className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Use Your Vehicle</h3>
            <p className="text-sm text-muted-foreground">Car, bike, or on foot</p>
          </Card>
          <Card className="text-center p-6">
            <Briefcase className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">No Experience</h3>
            <p className="text-sm text-muted-foreground">We'll train you</p>
          </Card>
        </div>

        {/* Application Form */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Operator Application</CardTitle>
            <CardDescription>
              Fill out the form below to apply. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="driversLicense">Driver's License Number</Label>
                  <Input
                    id="driversLicense"
                    value={formData.driversLicense}
                    onChange={(e) => handleInputChange('driversLicense', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicleType">Transportation Method</Label>
                  <Select value={formData.vehicleType} onValueChange={(value) => handleInputChange('vehicleType', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transportation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Personal Car</SelectItem>
                      <SelectItem value="bike">Bicycle</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="walking">On Foot</SelectItem>
                      <SelectItem value="public_transport">Public Transportation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={formData.availability} onValueChange={(value) => handleInputChange('availability', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time (30+ hours/week)</SelectItem>
                      <SelectItem value="part_time">Part-time (15-30 hours/week)</SelectItem>
                      <SelectItem value="casual">Casual (Under 15 hours/week)</SelectItem>
                      <SelectItem value="weekends_only">Weekends Only</SelectItem>
                      <SelectItem value="evenings">Evenings Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="experience">Relevant Experience (Optional)</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="Any experience in delivery, customer service, or similar work..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="motivation">Why do you want to become an operator?</Label>
                <Textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  placeholder="Tell us why you're interested in this opportunity..."
                  required
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">What's Next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• We'll review your application within 2-3 business days</li>
                  <li>• If selected, we'll contact you for a brief phone interview</li>
                  <li>• Background check and training will be completed before you start</li>
                  <li>• You'll receive your first assignments within a week of approval</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
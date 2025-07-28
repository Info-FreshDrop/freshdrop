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
import { FreshDropWasherApplication } from "./FreshDropWasherApplication";

export function OperatorApplication() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
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
            <p className="text-sm text-muted-foreground">Car, truck, or van required</p>
          </Card>
          <Card className="text-center p-6">
            <Briefcase className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">No Experience</h3>
            <p className="text-sm text-muted-foreground">We'll train you</p>
          </Card>
        </div>

        {/* Apply Now Button */}
        <div className="text-center mb-8">
          <Button 
            onClick={() => setShowApplicationForm(!showApplicationForm)}
            variant="default"
            size="xl"
            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-64"
          >
            {showApplicationForm ? 'Hide Application' : 'Apply Now'}
          </Button>
        </div>

        {/* Enhanced Application Form - Only show when requested */}
        {showApplicationForm && (
          <div className="mt-8">
            <FreshDropWasherApplication />
          </div>
        )}
      </div>
    </section>
  );
}
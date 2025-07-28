import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Camera, CheckCircle, AlertCircle } from "lucide-react";

interface ApplicationFormData {
  // Basic Info
  fullName: string;
  email: string;
  phone: string;
  zipCode: string;

  // Washer & Dryer Verification
  washerPhoto: File | null;
  washerInsidePhoto: File | null;
  dryerPhoto: File | null;
  dryerInsidePhoto: File | null;
  washerLocation: string;
  washerBrand: string;

  // Vehicle Confirmation
  hasVehicle: boolean;
  vehicleDetails: string;

  // Laundry Skills Test
  towelPhoto: File | null;
  tshirtPhoto: File | null;
  laundryStackPhoto: File | null;

  // Laundry Space & Cleanliness
  isCleanSmokeFree: boolean;
  hasFoldingSpace: boolean;
  laundryAreaPhoto: File | null;

  // Tools & Supplies
  supplies: string[];

  // Schedule & Reliability
  weeklyAvailability: string;
  availableDays: string[];
  canReturn24to48hrs: boolean;

  // Agreements
  agreesToStandards: boolean;
  wontMixLoads: boolean;
  treatWithCare: boolean;
  agreesToTerms: boolean;
}

export function FreshDropWasherApplication() {
  const [formData, setFormData] = useState<ApplicationFormData>({
    fullName: '',
    email: '',
    phone: '',
    zipCode: '',
    washerPhoto: null,
    washerInsidePhoto: null,
    dryerPhoto: null,
    dryerInsidePhoto: null,
    washerLocation: '',
    washerBrand: '',
    hasVehicle: false,
    vehicleDetails: '',
    towelPhoto: null,
    tshirtPhoto: null,
    laundryStackPhoto: null,
    isCleanSmokeFree: false,
    hasFoldingSpace: false,
    laundryAreaPhoto: null,
    supplies: [],
    weeklyAvailability: '',
    availableDays: [],
    canReturn24to48hrs: false,
    agreesToStandards: false,
    wontMixLoads: false,
    treatWithCare: false,
    agreesToTerms: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: keyof ApplicationFormData, file: File) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const handleSupplyToggle = (supply: string) => {
    setFormData(prev => ({
      ...prev,
      supplies: prev.supplies.includes(supply)
        ? prev.supplies.filter(s => s !== supply)
        : [...prev.supplies, supply]
    }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.fullName && formData.email && formData.phone && formData.zipCode);
      case 2:
        return !!(
          formData.washerPhoto && 
          formData.washerInsidePhoto && 
          formData.dryerPhoto && 
          formData.dryerInsidePhoto && 
          formData.washerLocation
        );
      case 3:
        return !!(formData.hasVehicle && formData.vehicleDetails);
      case 4:
        return !!(formData.towelPhoto && formData.tshirtPhoto && formData.laundryStackPhoto);
      case 5:
        return !!(formData.isCleanSmokeFree && formData.hasFoldingSpace && formData.laundryAreaPhoto);
      case 6:
        return formData.supplies.length > 0;
      case 7:
        return !!(formData.weeklyAvailability && formData.availableDays.length > 0 && formData.canReturn24to48hrs);
      case 8:
        return !!(formData.agreesToStandards && formData.wontMixLoads && formData.treatWithCare && formData.agreesToTerms);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 8));
    } else {
      toast({
        title: "Incomplete Section",
        description: "Please complete all required fields before proceeding.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const uploadPhoto = async (file: File, fileName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${fileName}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('application-photos')
        .upload(uniqueFileName, file);

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('application-photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Incomplete Application",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Remove old eligibility restrictions - now allow shared and laundromat
    // Only block if no location is selected
    if (!formData.washerLocation) {
      toast({
        title: "Location Required",
        description: "Please select your washer/dryer location.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload all photos
      const photoUrls = {
        washer_photo_url: formData.washerPhoto ? await uploadPhoto(formData.washerPhoto, 'washer') : null,
        washer_inside_photo_url: formData.washerInsidePhoto ? await uploadPhoto(formData.washerInsidePhoto, 'washer_inside') : null,
        dryer_photo_url: formData.dryerPhoto ? await uploadPhoto(formData.dryerPhoto, 'dryer') : null,
        dryer_inside_photo_url: formData.dryerInsidePhoto ? await uploadPhoto(formData.dryerInsidePhoto, 'dryer_inside') : null,
        towel_photo_url: formData.towelPhoto ? await uploadPhoto(formData.towelPhoto, 'towel') : null,
        tshirt_photo_url: formData.tshirtPhoto ? await uploadPhoto(formData.tshirtPhoto, 'tshirt') : null,
        laundry_stack_photo_url: formData.laundryStackPhoto ? await uploadPhoto(formData.laundryStackPhoto, 'laundry_stack') : null,
        laundry_area_photo_url: formData.laundryAreaPhoto ? await uploadPhoto(formData.laundryAreaPhoto, 'laundry_area') : null,
      };

      // Save application data including photo URLs
      const { error } = await supabase
        .from('operator_applications')
        .insert([
          {
            first_name: formData.fullName.split(' ')[0],
            last_name: formData.fullName.split(' ').slice(1).join(' '),
            email: formData.email,
            phone: formData.phone,
            address: 'Home-based washer/dryer application', // Required field
            city: 'N/A', // Required field
            state: 'N/A', // Required field
            zip_code: formData.zipCode,
            drivers_license: 'N/A',
            vehicle_type: formData.hasVehicle ? formData.vehicleDetails : 'none',
            availability: formData.weeklyAvailability,
            experience: `Supplies: ${formData.supplies.join(', ')}. Days: ${formData.availableDays.join(', ')}`,
            motivation: `Washer brand: ${formData.washerBrand}, Location: ${formData.washerLocation}`,
            status: 'pending',
            ...photoUrls
          }
        ]);

      if (error) throw error;

      toast({
        title: "Application Submitted Successfully!",
        description: "Thank you for your comprehensive application! We'll review it and contact you within 2-3 business days.",
      });

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        zipCode: '',
        washerPhoto: null,
        washerInsidePhoto: null,
        dryerPhoto: null,
        dryerInsidePhoto: null,
        washerLocation: '',
        washerBrand: '',
        hasVehicle: false,
        vehicleDetails: '',
        towelPhoto: null,
        tshirtPhoto: null,
        laundryStackPhoto: null,
        isCleanSmokeFree: false,
        hasFoldingSpace: false,
        laundryAreaPhoto: null,
        supplies: [],
        weeklyAvailability: '',
        availableDays: [],
        canReturn24to48hrs: false,
        agreesToStandards: false,
        wontMixLoads: false,
        treatWithCare: false,
        agreesToTerms: false,
      });
      setCurrentStep(1);
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

  const FileUploadBox = ({ label, file, onFileChange, required = true }: {
    label: string;
    file: File | null;
    onFileChange: (file: File) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label} {required && "*"}</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center relative">
        {file ? (
          <div className="flex items-center justify-center space-x-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">{file.name}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Click to upload or drag and drop</div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">1. Basic Information</h3>
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
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
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="For service area filtering"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">2. Washer & Dryer Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploadBox
                label="Washer Photo (front)"
                file={formData.washerPhoto}
                onFileChange={(file) => handleFileUpload('washerPhoto', file)}
              />
              <FileUploadBox
                label="Washer Photo (inside)"
                file={formData.washerInsidePhoto}
                onFileChange={(file) => handleFileUpload('washerInsidePhoto', file)}
              />
              <FileUploadBox
                label="Dryer Photo (front)"
                file={formData.dryerPhoto}
                onFileChange={(file) => handleFileUpload('dryerPhoto', file)}
              />
              <FileUploadBox
                label="Dryer Photo (inside)"
                file={formData.dryerInsidePhoto}
                onFileChange={(file) => handleFileUpload('dryerInsidePhoto', file)}
              />
            </div>
            <div>
              <Label>Washer/Dryer Location *</Label>
              <Select value={formData.washerLocation} onValueChange={(value) => handleInputChange('washerLocation', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">✅ In my home</SelectItem>
                  <SelectItem value="shared">✅ Shared</SelectItem>
                  <SelectItem value="laundromat">✅ Laundromat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="washerBrand">Washer Brand/Type (Optional)</Label>
              <Input
                id="washerBrand"
                value={formData.washerBrand}
                onChange={(e) => handleInputChange('washerBrand', e.target.value)}
                placeholder="e.g., Samsung front-loader"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">3. Vehicle Confirmation</h3>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="hasVehicle"
                checked={formData.hasVehicle}
                onCheckedChange={(checked) => handleInputChange('hasVehicle', checked)}
              />
              <Label htmlFor="hasVehicle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                ✅ I have access to a reliable vehicle for pickups and deliveries *
              </Label>
            </div>
            {formData.hasVehicle && (
              <div>
                <Label htmlFor="vehicleDetails">What is the make, model, and color of the vehicle you'll use for pickups/deliveries? *</Label>
                <Input
                  id="vehicleDetails"
                  value={formData.vehicleDetails}
                  onChange={(e) => handleInputChange('vehicleDetails', e.target.value)}
                  placeholder="e.g., Blue 2019 Honda Civic"
                  required
                />
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">4. Laundry Skills Test</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please upload photos of your laundry folding skills. Use a clean, well-lit surface.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUploadBox
                label="A folded bath towel"
                file={formData.towelPhoto}
                onFileChange={(file) => handleFileUpload('towelPhoto', file)}
              />
              <FileUploadBox
                label="A folded t-shirt"
                file={formData.tshirtPhoto}
                onFileChange={(file) => handleFileUpload('tshirtPhoto', file)}
              />
              <FileUploadBox
                label="A stack of folded laundry"
                file={formData.laundryStackPhoto}
                onFileChange={(file) => handleFileUpload('laundryStackPhoto', file)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">5. Laundry Space & Cleanliness</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCleanSmokeFree"
                  checked={formData.isCleanSmokeFree}
                  onCheckedChange={(checked) => handleInputChange('isCleanSmokeFree', checked)}
                />
                <Label htmlFor="isCleanSmokeFree">My home is clean and smoke-free *</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasFoldingSpace"
                  checked={formData.hasFoldingSpace}
                  onCheckedChange={(checked) => handleInputChange('hasFoldingSpace', checked)}
                />
                <Label htmlFor="hasFoldingSpace">I have a dedicated folding space *</Label>
              </div>
            </div>
            <FileUploadBox
              label="Photo of laundry area or folding space"
              file={formData.laundryAreaPhoto}
              onFileChange={(file) => handleFileUpload('laundryAreaPhoto', file)}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">6. Tools & Supplies Checklist</h3>
            <p className="text-sm text-muted-foreground mb-4">Select all that you have available:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Laundry detergent (Free & Clear)',
                'Laundry detergent (Standard)',
                'Clear plastic bags'
              ].map((supply) => (
                <div key={supply} className="flex items-center space-x-2">
                  <Checkbox
                    id={supply}
                    checked={formData.supplies.includes(supply)}
                    onCheckedChange={() => handleSupplyToggle(supply)}
                  />
                  <Label htmlFor={supply} className="text-sm">{supply}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">7. Schedule & Reliability</h3>
            <div>
              <Label>Weekly Availability *</Label>
              <Select value={formData.weeklyAvailability} onValueChange={(value) => handleInputChange('weeklyAvailability', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hours per week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<10">Less than 10 hours</SelectItem>
                  <SelectItem value="10-20">10-20 hours</SelectItem>
                  <SelectItem value="20-30">20-30 hours</SelectItem>
                  <SelectItem value="30+">30+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block">Available Days *</Label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.availableDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canReturn24to48hrs"
                checked={formData.canReturn24to48hrs}
                onCheckedChange={(checked) => handleInputChange('canReturn24to48hrs', checked)}
              />
              <Label htmlFor="canReturn24to48hrs">✅ I can return all laundry within 24 hours unless marked as an express order *</Label>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">8. Agreements</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreesToStandards"
                  checked={formData.agreesToStandards}
                  onCheckedChange={(checked) => handleInputChange('agreesToStandards', checked)}
                />
                <Label htmlFor="agreesToStandards">I agree to FreshDrop's cleanliness, speed, and service standards *</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wontMixLoads"
                  checked={formData.wontMixLoads}
                  onCheckedChange={(checked) => handleInputChange('wontMixLoads', checked)}
                />
                <Label htmlFor="wontMixLoads">I will not mix customer loads *</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="treatWithCare"
                  checked={formData.treatWithCare}
                  onCheckedChange={(checked) => handleInputChange('treatWithCare', checked)}
                />
                <Label htmlFor="treatWithCare">I will treat all laundry with care and confidentiality *</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreesToTerms"
                  checked={formData.agreesToTerms}
                  onCheckedChange={(checked) => handleInputChange('agreesToTerms', checked)}
                />
                <Label htmlFor="agreesToTerms">All terms and conditions of being a FreshDrop Operator *</Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🧼 FreshDrop Washer Application Form
          <span className="text-sm font-normal text-muted-foreground">
            Step {currentStep} of 8
          </span>
        </CardTitle>
        <CardDescription>
          Complete comprehensive application to become a FreshDrop washer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </div>
        </div>

        {renderStepContent()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          {currentStep < 8 ? (
            <Button onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !validateCurrentStep()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
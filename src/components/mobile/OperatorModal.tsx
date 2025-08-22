import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Clock, Car, Briefcase, ChevronLeft, ChevronRight, Upload, CheckCircle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  driversLicense: string;
  
  // Vehicle & Equipment
  hasVehicle: boolean;
  vehicleType: string;
  vehicleDetails: string;
  hasWasherDryer: boolean;
  washerLocation: string;
  washerBrand: string;
  
  // Photo Verification
  washerPhoto: File | null;
  washerInsidePhoto: File | null;
  dryerPhoto: File | null;
  dryerInsidePhoto: File | null;
  towelPhoto: File | null;
  tshirtPhoto: File | null;
  laundryStackPhoto: File | null;
  laundryAreaPhoto: File | null;
  
  // Availability & Service
  availability: string;
  availableDays: string[];
  weeklyHours: string;
  canReturn24to48hrs: boolean;
  serviceZipCodes: string[];
  
  // Skills & Experience
  experience: string;
  motivation: string;
  hasLaundryExperience: boolean;
  
  // Agreements
  agreesToStandards: boolean;
  agreesToTerms: boolean;
}

export function OperatorModal({ isOpen, onClose }: OperatorModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    driversLicense: '',
    hasVehicle: false,
    vehicleType: '',
    vehicleDetails: '',
    hasWasherDryer: false,
    washerLocation: '',
    washerBrand: '',
    washerPhoto: null,
    washerInsidePhoto: null,
    dryerPhoto: null,
    dryerInsidePhoto: null,
    towelPhoto: null,
    tshirtPhoto: null,
    laundryStackPhoto: null,
    laundryAreaPhoto: null,
    availability: '',
    availableDays: [],
    weeklyHours: '',
    canReturn24to48hrs: false,
    serviceZipCodes: [],
    experience: '',
    motivation: '',
    hasLaundryExperience: false,
    agreesToStandards: false,
    agreesToTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zipCodeInput, setZipCodeInput] = useState('');
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

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const addZipCode = () => {
    const zipCode = zipCodeInput.trim();
    if (zipCode && !formData.serviceZipCodes.includes(zipCode)) {
      setFormData(prev => ({
        ...prev,
        serviceZipCodes: [...prev.serviceZipCodes, zipCode]
      }));
      setZipCodeInput('');
    }
  };

  const removeZipCode = (zipCodeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      serviceZipCodes: prev.serviceZipCodes.filter(zip => zip !== zipCodeToRemove)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone);
      case 2:
        return !!(formData.address && formData.city && formData.state && formData.zipCode && formData.driversLicense);
      case 3:
        return !!(formData.hasVehicle && formData.vehicleType && (formData.hasVehicle ? formData.vehicleDetails : true));
      case 4:
        return !!(formData.hasWasherDryer && (formData.hasWasherDryer ? formData.washerLocation : true));
      case 5:
        // Photo verification step - require equipment photos if has washer/dryer
        if (formData.hasWasherDryer) {
          return !!(formData.washerPhoto && formData.washerInsidePhoto && formData.dryerPhoto && formData.dryerInsidePhoto);
        }
        return true;
      case 6:
        // Laundry skills photos (optional for mobile)
        return true;
      case 7:
        return !!(formData.availability && formData.availableDays.length > 0 && formData.weeklyHours && formData.serviceZipCodes.length > 0);
      case 8:
        return !!(formData.agreesToStandards && formData.agreesToTerms);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    if (!validateStep(8)) {
      toast({
        title: "Incomplete Application",
        description: "Please complete all required fields and agreements.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload all photos if they exist
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

      const { data, error } = await supabase
        .from('operator_applications')
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          drivers_license: formData.driversLicense,
          vehicle_type: formData.hasVehicle ? `${formData.vehicleType} - ${formData.vehicleDetails}` : 'No vehicle',
          availability: `${formData.availability} - ${formData.weeklyHours}/week - Days: ${formData.availableDays.join(', ')} - Service areas: ${formData.serviceZipCodes.join(', ')}`,
          experience: `${formData.hasLaundryExperience ? 'Has laundry experience' : 'No laundry experience'} - ${formData.experience}`,
          motivation: `${formData.motivation} - Equipment: ${formData.hasWasherDryer ? `${formData.washerLocation} washer/dryer ${formData.washerBrand}` : 'No equipment'}`,
          status: 'pending',
          ...photoUrls
        }]);

      if (error) {
        console.error('Database error:', error);
        
        let errorMessage = "There was an error submitting your application. Please try again.";
        if (error.message.includes('duplicate')) {
          errorMessage = "An application with this email already exists. Please use a different email or contact support.";
        }
        
        toast({
          title: "Application failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest! We'll review your mobile application and may ask you to complete additional verification steps.",
      });

      // Reset form
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', driversLicense: '',
        hasVehicle: false, vehicleType: '', vehicleDetails: '', hasWasherDryer: false, washerLocation: '', washerBrand: '',
        washerPhoto: null, washerInsidePhoto: null, dryerPhoto: null, dryerInsidePhoto: null,
        towelPhoto: null, tshirtPhoto: null, laundryStackPhoto: null, laundryAreaPhoto: null,
        availability: '', availableDays: [], weeklyHours: '', canReturn24to48hrs: false, serviceZipCodes: [],
        experience: '', motivation: '', hasLaundryExperience: false, agreesToStandards: false, agreesToTerms: false
      });
      setCurrentStep(1);
      onClose();
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Application failed",
        description: error.message || "An unexpected error occurred. Please try again.",
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
      <Label className="ios-caption1">{label} {required && "*"}</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center relative">
        {file ? (
          <div className="flex items-center justify-center space-x-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="ios-caption2">{file.name}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="ios-caption2 text-muted-foreground">Tap to take photo</div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
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
            <h3 className="ios-title3 font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="ios-caption1">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="ios-caption1">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="ios-caption1">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="ios-caption1">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Address Information</h3>
            <div>
              <Label htmlFor="address" className="ios-caption1">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city" className="ios-caption1">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state" className="ios-caption1">State *</Label>
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
                <Label htmlFor="zipCode" className="ios-caption1">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="driversLicense" className="ios-caption1">Driver's License *</Label>
                <Input
                  id="driversLicense"
                  value={formData.driversLicense}
                  onChange={(e) => handleInputChange('driversLicense', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Vehicle Information</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasVehicle"
                checked={formData.hasVehicle}
                onCheckedChange={(checked) => handleInputChange('hasVehicle', checked)}
              />
              <Label htmlFor="hasVehicle" className="ios-caption1">I have access to a reliable vehicle *</Label>
            </div>
            {formData.hasVehicle && (
              <>
                <div>
                  <Label htmlFor="vehicleType" className="ios-caption1">Vehicle Type *</Label>
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
                  <Label htmlFor="vehicleDetails" className="ios-caption1">Vehicle Details *</Label>
                  <Input
                    id="vehicleDetails"
                    value={formData.vehicleDetails}
                    onChange={(e) => handleInputChange('vehicleDetails', e.target.value)}
                    placeholder="e.g., Blue 2019 Honda Civic"
                    required
                  />
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Laundry Equipment</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasWasherDryer"
                checked={formData.hasWasherDryer}
                onCheckedChange={(checked) => handleInputChange('hasWasherDryer', checked)}
              />
              <Label htmlFor="hasWasherDryer" className="ios-caption1">I have access to washer/dryer *</Label>
            </div>
            {formData.hasWasherDryer && (
              <>
                <div>
                  <Label className="ios-caption1">Washer/Dryer Location *</Label>
                  <Select value={formData.washerLocation} onValueChange={(value) => handleInputChange('washerLocation', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">In my home</SelectItem>
                      <SelectItem value="shared">Shared facility</SelectItem>
                      <SelectItem value="laundromat">Laundromat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="washerBrand" className="ios-caption1">Washer Brand/Type (Optional)</Label>
                  <Input
                    id="washerBrand"
                    value={formData.washerBrand}
                    onChange={(e) => handleInputChange('washerBrand', e.target.value)}
                    placeholder="e.g., Samsung front-loader"
                  />
                </div>
              </>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasLaundryExperience"
                checked={formData.hasLaundryExperience}
                onCheckedChange={(checked) => handleInputChange('hasLaundryExperience', checked)}
              />
              <Label htmlFor="hasLaundryExperience" className="ios-caption1">I have laundry/cleaning experience</Label>
            </div>
            <div>
              <Label htmlFor="experience" className="ios-caption1">Experience & Skills (Optional)</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Any relevant experience..."
                className="min-h-[60px]"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Equipment Photo Verification</h3>
            {formData.hasWasherDryer ? (
              <>
                <p className="ios-caption2 text-muted-foreground">
                  Please provide photos of your washer and dryer equipment for verification.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <FileUploadBox
                    label="Washer Photo (front view)"
                    file={formData.washerPhoto}
                    onFileChange={(file) => handleInputChange('washerPhoto', file)}
                  />
                  <FileUploadBox
                    label="Washer Photo (inside view)"
                    file={formData.washerInsidePhoto}
                    onFileChange={(file) => handleInputChange('washerInsidePhoto', file)}
                  />
                  <FileUploadBox
                    label="Dryer Photo (front view)"
                    file={formData.dryerPhoto}
                    onFileChange={(file) => handleInputChange('dryerPhoto', file)}
                  />
                  <FileUploadBox
                    label="Dryer Photo (inside view)"
                    file={formData.dryerInsidePhoto}
                    onFileChange={(file) => handleInputChange('dryerInsidePhoto', file)}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="ios-body text-muted-foreground">
                  No equipment photos required since you don't have washer/dryer access.
                </p>
                <p className="ios-caption2 text-muted-foreground mt-2">
                  You'll be able to use customer pickup/delivery services or partner facilities.
                </p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Laundry Skills (Optional)</h3>
            <p className="ios-caption2 text-muted-foreground">
              These photos help us assess your laundry skills. They're optional for mobile applications.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <FileUploadBox
                label="Folded Towel Photo"
                file={formData.towelPhoto}
                onFileChange={(file) => handleInputChange('towelPhoto', file)}
                required={false}
              />
              <FileUploadBox
                label="Folded T-Shirt Photo"
                file={formData.tshirtPhoto}
                onFileChange={(file) => handleInputChange('tshirtPhoto', file)}
                required={false}
              />
              <FileUploadBox
                label="Laundry Stack Photo"
                file={formData.laundryStackPhoto}
                onFileChange={(file) => handleInputChange('laundryStackPhoto', file)}
                required={false}
              />
              <FileUploadBox
                label="Laundry Area Photo"
                file={formData.laundryAreaPhoto}
                onFileChange={(file) => handleInputChange('laundryAreaPhoto', file)}
                required={false}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Availability & Service</h3>
            <div>
              <Label htmlFor="availability" className="ios-caption1">Preferred Time Slots *</Label>
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
              <Label className="ios-caption1">Available Days *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.availableDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label htmlFor={day} className="ios-caption2">{day}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="weeklyHours" className="ios-caption1">Hours per week *</Label>
              <Select value={formData.weeklyHours} onValueChange={(value) => handleInputChange('weeklyHours', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5-10">5-10 hours</SelectItem>
                  <SelectItem value="10-20">10-20 hours</SelectItem>
                  <SelectItem value="20-30">20-30 hours</SelectItem>
                  <SelectItem value="30+">30+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="ios-caption1">Service Zip Codes *</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={zipCodeInput}
                  onChange={(e) => setZipCodeInput(e.target.value)}
                  placeholder="Enter zip code"
                  onKeyPress={(e) => e.key === 'Enter' && addZipCode()}
                />
                <Button type="button" onClick={addZipCode} size="sm" disabled={!zipCodeInput.trim()}>
                  Add
                </Button>
              </div>
              {formData.serviceZipCodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.serviceZipCodes.map((zip) => (
                    <div key={zip} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                      {zip}
                      <button
                        type="button"
                        onClick={() => removeZipCode(zip)}
                        className="text-primary hover:text-primary/70 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h3 className="ios-title3 font-semibold">Terms & Agreements</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreesToStandards"
                  checked={formData.agreesToStandards}
                  onCheckedChange={(checked) => handleInputChange('agreesToStandards', checked)}
                />
                <Label htmlFor="agreesToStandards" className="ios-caption2 leading-relaxed">
                  I agree to maintain high quality standards and treat all customer items with care *
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreesToTerms"
                  checked={formData.agreesToTerms}
                  onCheckedChange={(checked) => handleInputChange('agreesToTerms', checked)}
                />
                <Label htmlFor="agreesToTerms" className="ios-caption2 leading-relaxed">
                  I agree to the Terms of Service and Privacy Policy *
                </Label>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="ios-caption2 text-muted-foreground mb-2">
                <strong>Application Complete!</strong> After submission:
              </p>
              <ul className="ios-caption2 text-muted-foreground space-y-1">
                <li>• We'll review your application within 2-3 business days</li>
                <li>• Background check and verification process</li>
                <li>• Training and onboarding if approved</li>
                <li>• Start earning money as an independent operator!</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-xl flex flex-col">
        <SheetHeader className="text-left flex-shrink-0">
          <SheetTitle className="ios-title2">Be Your Own Boss</SheetTitle>
          <p className="ios-body text-muted-foreground">Join our network of independent operators</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 pb-6">
            {currentStep === 1 && (
              <>
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
              </>
            )}

            {/* Progress indicator */}
            <div className="flex items-center justify-between">
              <span className="ios-caption2 text-muted-foreground">Step {currentStep} of 8</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step Content */}
            {renderStepContent()}
          </div>
        </div>

        {/* Fixed Navigation Footer */}
        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < 8 ? (
              <Button 
                onClick={nextStep}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
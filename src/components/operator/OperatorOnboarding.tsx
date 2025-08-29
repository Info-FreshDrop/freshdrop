import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, User, FileText, Calendar, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TaxFormsUpload } from './TaxFormsUpload';
import { ScheduleSetup } from './ScheduleSetup';
import { TrainingContent } from './TrainingContent';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  required: boolean;
}

interface OperatorOnboardingProps {
  onComplete: () => void;
}

export const OperatorOnboarding: React.FC<OperatorOnboardingProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<string>('profile');
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add your personal information and contact details',
      icon: User,
      completed: false,
      required: true
    },
    {
      id: 'tax-forms',
      title: 'Tax Documentation',
      description: 'Upload required tax forms (W-9, etc.)',
      icon: FileText,
      completed: false,
      required: true
    },
    {
      id: 'schedule',
      title: 'Set Availability',
      description: 'Configure your working hours and service areas',
      icon: Calendar,
      completed: false,
      required: true
    },
    {
      id: 'training',
      title: 'Complete Training',
      description: 'Watch training videos and complete required modules',
      icon: GraduationCap,
      completed: false,
      required: true
    }
  ]);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      if (!user) return;

      // Check profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Check tax forms
      const { data: taxForms } = await supabase
        .from('profiles')
        .select('w9_completed, w9_file_url')
        .eq('user_id', user.id)
        .single();

      // Check schedule setup
      const { data: washer } = await supabase
        .from('washers')
        .select('availability_schedule, zip_codes')
        .eq('user_id', user.id)
        .single();

      // Check training completion (you can add a training_completed field to profiles)
      const trainingCompleted = profile?.training_completed || false;

      setSteps(prev => prev.map(step => {
        switch (step.id) {
          case 'profile':
            return {
              ...step,
              completed: !!(profile?.first_name && profile?.last_name && profile?.phone)
            };
          case 'tax-forms':
            return {
              ...step,
              completed: !!(taxForms?.w9_completed && taxForms?.w9_file_url)
            };
          case 'schedule':
            return {
              ...step,
              completed: !!(washer?.zip_codes?.length && 
                Object.values(washer?.availability_schedule || {}).some((day: any) => day.available))
            };
          case 'training':
            return {
              ...step,
              completed: trainingCompleted
            };
          default:
            return step;
        }
      }));

      // Set current step to first incomplete step
      const firstIncomplete = steps.find(step => !step.completed);
      if (firstIncomplete) {
        setCurrentStep(firstIncomplete.id);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));

    // Move to next incomplete step
    const currentIndex = steps.findIndex(step => step.id === stepId);
    const nextStep = steps.slice(currentIndex + 1).find(step => !step.completed);
    
    if (nextStep) {
      setCurrentStep(nextStep.id);
    } else {
      // All steps completed - update user metadata and complete onboarding
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      if (!user) return;

      // Update user metadata to remove onboarding flag
      const { error } = await supabase.auth.updateUser({
        data: { needs_onboarding: false }
      });

      if (error) throw error;

      // Update washer profile
      await supabase
        .from('washers')
        .update({ is_verified: true })
        .eq('user_id', user.id);

      toast({
        title: "Onboarding Complete! 🎉",
        description: "Welcome to FreshDrop! You can now start accepting orders."
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'profile':
        return (
          <div className="space-y-4">
            <p>Please complete your profile information to continue.</p>
            <Button onClick={() => handleStepComplete('profile')}>
              Complete Profile
            </Button>
          </div>
        );
      case 'tax-forms':
        return <TaxFormsUpload onComplete={() => handleStepComplete('tax-forms')} />;
      case 'schedule':
        return <ScheduleSetup onComplete={() => handleStepComplete('schedule')} />;
      case 'training':
        return <TrainingContent onComplete={() => handleStepComplete('training')} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to FreshDrop!</h1>
        <p className="text-muted-foreground">Let's get you set up to start earning</p>
        <div className="flex items-center justify-center gap-2">
          <Progress value={progress} className="w-64" />
          <span className="text-sm text-muted-foreground">{completedSteps}/{totalSteps}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps Sidebar */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isPast = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <Card 
                key={step.id} 
                className={`cursor-pointer transition-all ${
                  isActive ? 'ring-2 ring-primary' : ''
                } ${step.completed ? 'border-green-200 bg-green-50' : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      step.completed 
                        ? 'bg-green-100 text-green-600'
                        : isActive 
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {step.completed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(steps.find(s => s.id === currentStep)?.icon || User, {
                  className: "h-5 w-5"
                })}
                {steps.find(s => s.id === currentStep)?.title}
              </CardTitle>
              <CardDescription>
                {steps.find(s => s.id === currentStep)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
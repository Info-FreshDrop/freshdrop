import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/utils/inputValidation';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection } from '@/components/ui/ios-layout';
import { IOSHeader } from '@/components/ui/ios-navigation';
import { IOSInput, IOSFormSection } from '@/components/ui/ios-form';
import { HapticButton, IOSPrimaryButton } from '@/components/ui/haptic-button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthFormsProps {
  onBack: () => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!validateEmail(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please ensure your passwords match",
          variant: "destructive",
        });
        return false;
      }

      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter your first and last name",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message || "Invalid email or password",
            variant: "destructive",
          });
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim()
        });
        
        if (error) {
          if (error.message?.includes('already registered')) {
            toast({
              title: "Account already exists",
              description: "Please sign in instead or reset your password",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Registration failed",
              description: error.message || "Please try again",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Authentication error",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IOSScreen>
      <IOSHeader 
        title={isLogin ? 'Sign In' : 'Create Account'}
        leftButton={{
          text: "Back",
          onClick: onBack
        }}
      />
      
      <IOSContent>
        <IOSScrollView>
          <IOSSection>
            <p className="ios-subhead text-muted-foreground mb-6 text-center">
              {isLogin 
                ? 'Welcome back! Please sign in to your account.' 
                : 'Join FreshDrop for convenient laundry service.'
              }
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <IOSFormSection title="Personal Information">
                  <div className="grid grid-cols-2 gap-4">
                    <IOSInput
                      label="First Name"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required={!isLogin}
                      maxLength={50}
                    />
                    <IOSInput
                      label="Last Name"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required={!isLogin}
                      maxLength={50}
                    />
                  </div>
                </IOSFormSection>
              )}
              
              <IOSFormSection title="Account Details">
                <IOSInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  maxLength={100}
                />
                
                <div className="relative">
                  <IOSInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={8}
                    maxLength={100}
                  />
                  <HapticButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-8 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </HapticButton>
                </div>
                
                {!isLogin && (
                  <>
                    <IOSInput
                      label="Confirm Password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      required={!isLogin}
                      maxLength={100}
                    />
                    <p className="ios-footnote text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </>
                )}
              </IOSFormSection>

              <div className="space-y-4">
                <IOSPrimaryButton 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </IOSPrimaryButton>

                <div className="text-center">
                  <HapticButton
                    type="button"
                    variant="ghost"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ios-body"
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'
                    }
                  </HapticButton>
                </div>
              </div>
            </form>
          </IOSSection>
        </IOSScrollView>
      </IOSContent>
    </IOSScreen>
  );
};
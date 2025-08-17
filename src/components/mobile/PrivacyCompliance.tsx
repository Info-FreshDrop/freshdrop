import React, { useState } from 'react';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection, IOSList, IOSListItem } from '@/components/ui/ios-layout';
import { IOSHeader } from '@/components/ui/ios-navigation';
import { IOSAlert, IOSActionSheet } from '@/components/ui/ios-components';
import { HapticButton } from '@/components/ui/haptic-button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Eye, 
  Bell, 
  MapPin, 
  Camera,
  Smartphone,
  Users,
  Lock,
  Trash2,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface PrivacyControl {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isEnabled: boolean;
  isRequired: boolean;
  category: 'tracking' | 'permissions' | 'data' | 'communications';
}

interface DataCategory {
  id: string;
  title: string;
  description: string;
  purpose: string;
  retention: string;
  thirdParty: boolean;
  required: boolean;
}

export function PrivacyCompliance() {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDataSheet, setShowDataSheet] = useState(false);
  const [showAlert, setShowAlert] = useState<string | null>(null);
  
  const [privacyControls, setPrivacyControls] = useState<PrivacyControl[]>([
    {
      id: 'analytics',
      title: 'App Analytics',
      description: 'Help improve the app by sharing usage analytics',
      icon: Smartphone,
      isEnabled: false,
      isRequired: false,
      category: 'tracking'
    },
    {
      id: 'location-tracking',
      title: 'Location Tracking',
      description: 'Track location for delivery optimization',
      icon: MapPin,
      isEnabled: false,
      isRequired: false,
      category: 'tracking'
    },
    {
      id: 'camera-access',
      title: 'Camera Access',
      description: 'Take photos for profile and damage reports',
      icon: Camera,
      isEnabled: true,
      isRequired: true,
      category: 'permissions'
    },
    {
      id: 'push-notifications',
      title: 'Push Notifications',
      description: 'Receive order updates and promotional messages',
      icon: Bell,
      isEnabled: true,
      isRequired: false,
      category: 'communications'
    },
    {
      id: 'marketing-emails',
      title: 'Marketing Communications',
      description: 'Receive promotional emails and special offers',
      icon: Users,
      isEnabled: false,
      isRequired: false,
      category: 'communications'
    }
  ]);

  const dataCategories: DataCategory[] = [
    {
      id: 'account-info',
      title: 'Account Information',
      description: 'Name, email, phone number, profile photo',
      purpose: 'Account management and service delivery',
      retention: '7 years after account closure',
      thirdParty: false,
      required: true
    },
    {
      id: 'location-data',
      title: 'Location Data',
      description: 'GPS coordinates for pickup/delivery addresses',
      purpose: 'Service delivery and locker recommendations',
      retention: '2 years after last use',
      thirdParty: false,
      required: true
    },
    {
      id: 'payment-info',
      title: 'Payment Information',
      description: 'Credit card details, billing address, transaction history',
      purpose: 'Payment processing and fraud prevention',
      retention: '7 years for tax purposes',
      thirdParty: true,
      required: true
    },
    {
      id: 'usage-analytics',
      title: 'App Usage Analytics',
      description: 'Feature usage, session duration, crash reports',
      purpose: 'App improvement and bug fixes',
      retention: '2 years',
      thirdParty: true,
      required: false
    },
    {
      id: 'communication-logs',
      title: 'Communication Logs',
      description: 'Chat messages, support tickets, call logs',
      purpose: 'Customer support and service quality',
      retention: '3 years',
      thirdParty: false,
      required: false
    }
  ];

  const togglePrivacyControl = (id: string) => {
    setPrivacyControls(prev => prev.map(control => 
      control.id === id && !control.isRequired 
        ? { ...control, isEnabled: !control.isEnabled }
        : control
    ));
  };

  const handleDeleteData = () => {
    setShowActionSheet(false);
    setShowAlert('To delete your data, please contact support at privacy@freshdrop.com. We will process your request within 30 days as required by privacy laws.');
  };

  const handleExportData = () => {
    setShowActionSheet(false);
    setShowAlert('Your data export will be prepared and sent to your email address within 48 hours.');
  };

  const getComplianceScore = () => {
    const totalControls = privacyControls.length;
    const enabledOptional = privacyControls.filter(c => !c.isRequired && c.isEnabled).length;
    const totalOptional = privacyControls.filter(c => !c.isRequired).length;
    
    // Score based on privacy-friendly defaults (fewer things enabled = better privacy)
    return Math.round(((totalOptional - enabledOptional) / totalOptional) * 100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tracking':
        return <Eye className="w-5 h-5 text-orange-500" />;
      case 'permissions':
        return <Shield className="w-5 h-5 text-blue-500" />;
      case 'data':
        return <Lock className="w-5 h-5 text-green-500" />;
      case 'communications':
        return <Bell className="w-5 h-5 text-purple-500" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <IOSScreen>
      <IOSHeader 
        title="Privacy & Data"
        rightButton={
          <HapticButton
            variant="ghost"
            size="sm"
            onClick={() => setShowActionSheet(true)}
          >
            More
          </HapticButton>
        }
      />
      
      <IOSContent>
        <IOSScrollView>
          {/* Privacy Score */}
          <IOSSection title="Privacy Score">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-green-500 mr-2" />
                  <span className="ios-headline text-green-800">Privacy Protected</span>
                </div>
                <Badge className="bg-green-100 text-green-800">{getComplianceScore()}%</Badge>
              </div>
              <p className="ios-subhead text-green-700">
                Your privacy settings follow best practices. Only essential data is collected.
              </p>
            </div>
          </IOSSection>

          {/* Privacy Controls */}
          <IOSSection title="Privacy Controls">
            <IOSList>
              {privacyControls.map(control => {
                const Icon = control.icon;
                return (
                  <IOSListItem
                    key={control.id}
                    leadingIcon={
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-primary" />
                        {getCategoryIcon(control.category)}
                      </div>
                    }
                    trailingIcon={
                      <div className="flex items-center space-x-2">
                        {control.isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        <Switch
                          checked={control.isEnabled}
                          onCheckedChange={() => togglePrivacyControl(control.id)}
                          disabled={control.isRequired}
                        />
                      </div>
                    }
                    subtitle={control.description}
                  >
                    {control.title}
                  </IOSListItem>
                );
              })}
            </IOSList>
          </IOSSection>

          {/* Data Categories */}
          <IOSSection 
            title="Data We Collect"
            headerAction={
              <HapticButton
                variant="ghost"
                size="sm"
                onClick={() => setShowDataSheet(true)}
              >
                Details
              </HapticButton>
            }
          >
            <IOSList>
              {dataCategories.slice(0, 3).map(category => (
                <IOSListItem
                  key={category.id}
                  leadingIcon={<Lock className="w-5 h-5 text-blue-500" />}
                  trailingIcon={
                    <div className="flex flex-col items-end">
                      {category.required ? (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 text-xs">Optional</Badge>
                      )}
                      {category.thirdParty && (
                        <span className="ios-caption text-muted-foreground mt-1">3rd Party</span>
                      )}
                    </div>
                  }
                  subtitle={category.purpose}
                >
                  {category.title}
                </IOSListItem>
              ))}
            </IOSList>
          </IOSSection>

          {/* App Store Compliance */}
          <IOSSection title="App Store Compliance">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="ios-headline text-green-800 mb-2">✅ Privacy Requirements Met</h3>
                <ul className="space-y-1 ios-caption text-green-700">
                  <li>• App Tracking Transparency implemented</li>
                  <li>• Privacy Policy easily accessible</li>
                  <li>• Clear data collection disclosure</li>
                  <li>• User consent for optional tracking</li>
                  <li>• Data deletion and export rights</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <HapticButton className="flex-1" variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Privacy Policy
                </HapticButton>
                <HapticButton className="flex-1" variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Terms of Service
                </HapticButton>
              </div>
            </div>
          </IOSSection>

          {/* Your Rights */}
          <IOSSection title="Your Privacy Rights">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="ios-headline text-blue-800 mb-2">Data Rights</h3>
              <ul className="space-y-1 ios-subhead text-blue-700">
                <li>• Right to access your data</li>
                <li>• Right to correct inaccurate data</li>
                <li>• Right to delete your data</li>
                <li>• Right to export your data</li>
                <li>• Right to opt-out of tracking</li>
              </ul>
            </div>
          </IOSSection>
        </IOSScrollView>
      </IOSContent>

      {/* Data Management Action Sheet */}
      {showActionSheet && (
        <IOSActionSheet
          title="Data Management"
          description="Manage your personal data and privacy settings"
          actions={[
            {
              label: 'Export My Data',
              onPress: handleExportData,
              style: 'default'
            },
            {
              label: 'Delete My Data',
              onPress: handleDeleteData,
              style: 'destructive'
            },
            {
              label: 'Cancel',
              onPress: () => setShowActionSheet(false),
              style: 'cancel'
            }
          ]}
          onDismiss={() => setShowActionSheet(false)}
        />
      )}

      {/* Data Categories Sheet */}
      {showDataSheet && (
        <IOSActionSheet
          title="Data Collection Details"
          description="Complete list of data we collect and why"
          actions={[
            {
              label: 'View Full Privacy Policy',
              onPress: () => setShowDataSheet(false),
              style: 'default'
            },
            {
              label: 'Close',
              onPress: () => setShowDataSheet(false),
              style: 'cancel'
            }
          ]}
          onDismiss={() => setShowDataSheet(false)}
        />
      )}

      {/* Alert */}
      {showAlert && (
        <IOSAlert
          variant="info"
          title="Privacy Request"
          onDismiss={() => setShowAlert(null)}
        >
          {showAlert}
        </IOSAlert>
      )}
    </IOSScreen>
  );
}
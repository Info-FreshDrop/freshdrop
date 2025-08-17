import React, { useState, useEffect } from 'react';
import { useCapacitor } from '@/hooks/useCapacitor';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection, IOSList, IOSListItem } from '@/components/ui/ios-layout';
import { IOSHeader } from '@/components/ui/ios-navigation';
import { IOSAlert, IOSActionSheet } from '@/components/ui/ios-components';
import { HapticButton } from '@/components/ui/haptic-button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  MapPin, 
  Bell, 
  Vibrate, 
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Info
} from 'lucide-react';

interface NativeFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isAvailable?: boolean;
  hasPermission?: boolean;
  testAction?: () => Promise<void>;
}

export function NativeCapabilities() {
  const { 
    isNative, 
    permissions, 
    takePicture, 
    getCurrentLocation, 
    sendLocalNotification, 
    triggerHaptic 
  } = useCapacitor();

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [showAlert, setShowAlert] = useState<string | null>(null);

  const features: NativeFeature[] = [
    {
      id: 'camera',
      name: 'Camera Access',
      description: 'Take photos for profile pictures and damage reports',
      icon: Camera,
      isAvailable: isNative,
      hasPermission: permissions.camera,
      testAction: async () => {
        try {
          const result = await takePicture();
          if (result) {
            setTestResults(prev => ({ ...prev, camera: 'pass' }));
            setShowAlert('Camera test successful! Photo captured.');
          } else {
            setTestResults(prev => ({ ...prev, camera: 'fail' }));
            setShowAlert('Camera test failed. Please check permissions.');
          }
        } catch (error) {
          setTestResults(prev => ({ ...prev, camera: 'fail' }));
          setShowAlert(`Camera error: ${error}`);
        }
      }
    },
    {
      id: 'location',
      name: 'Location Services', 
      description: 'Find nearby lockers and enable delivery tracking',
      icon: MapPin,
      isAvailable: isNative,
      hasPermission: permissions.location,
      testAction: async () => {
        try {
          const location = await getCurrentLocation();
          if (location) {
            setTestResults(prev => ({ ...prev, location: 'pass' }));
            setShowAlert(`Location test successful! Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          } else {
            setTestResults(prev => ({ ...prev, location: 'fail' }));
            setShowAlert('Location test failed. Please check permissions.');
          }
        } catch (error) {
          setTestResults(prev => ({ ...prev, location: 'fail' }));
          setShowAlert(`Location error: ${error}`);
        }
      }
    },
    {
      id: 'notifications',
      name: 'Push Notifications',
      description: 'Receive updates about your laundry orders',
      icon: Bell,
      isAvailable: isNative,
      hasPermission: permissions.notifications,
      testAction: async () => {
        try {
          await sendLocalNotification(
            'FreshDrop Test',
            'Push notifications are working correctly!'
          );
          setTestResults(prev => ({ ...prev, notifications: 'pass' }));
          setShowAlert('Notification test successful! Check your notification center.');
        } catch (error) {
          setTestResults(prev => ({ ...prev, notifications: 'fail' }));
          setShowAlert(`Notification error: ${error}`);
        }
      }
    },
    {
      id: 'haptics',
      name: 'Haptic Feedback',
      description: 'Feel responsive touch feedback throughout the app',
      icon: Vibrate,
      isAvailable: isNative,
      hasPermission: true, // Haptics don't require explicit permission
      testAction: async () => {
        try {
          await triggerHaptic();
          setTestResults(prev => ({ ...prev, haptics: 'pass' }));
          setShowAlert('Haptic feedback test successful!');
        } catch (error) {
          setTestResults(prev => ({ ...prev, haptics: 'fail' }));
          setShowAlert(`Haptic error: ${error}`);
        }
      }
    }
  ];

  const getStatusIcon = (feature: NativeFeature) => {
    if (!isNative) {
      return <Info className="w-5 h-5 text-muted-foreground" />;
    }
    
    const testResult = testResults[feature.id];
    if (testResult === 'pass') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (testResult === 'fail') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (feature.hasPermission) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (feature: NativeFeature) => {
    if (!isNative) {
      return <Badge variant="secondary">Web</Badge>;
    }
    
    const testResult = testResults[feature.id];
    if (testResult === 'pass') {
      return <Badge className="bg-green-100 text-green-800">Tested</Badge>;
    } else if (testResult === 'fail') {
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    } else if (feature.hasPermission) {
      return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Needs Permission</Badge>;
    }
  };

  const runAllTests = async () => {
    setShowActionSheet(false);
    for (const feature of features) {
      if (feature.testAction && feature.isAvailable && feature.hasPermission) {
        setTestResults(prev => ({ ...prev, [feature.id]: 'pending' }));
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
        await feature.testAction();
      }
    }
    setShowAlert('All native capability tests completed!');
  };

  const readyFeatures = features.filter(f => f.isAvailable && f.hasPermission).length;
  const totalFeatures = features.length;

  return (
    <IOSScreen>
      <IOSHeader 
        title="Native Capabilities"
        rightButton={
          <HapticButton
            variant="ghost"
            size="sm"
            onClick={() => setShowActionSheet(true)}
          >
            Test All
          </HapticButton>
        }
      />
      
      <IOSContent>
        <IOSScrollView>
          {/* Platform Status */}
          <IOSSection title="Platform Status">
            <div className={`border rounded-lg p-4 ${isNative ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center mb-2">
                <Smartphone className={`w-5 h-5 mr-2 ${isNative ? 'text-green-500' : 'text-blue-500'}`} />
                <span className={`ios-headline ${isNative ? 'text-green-800' : 'text-blue-800'}`}>
                  {isNative ? 'Native iOS App' : 'Web Browser'}
                </span>
              </div>
              <p className={`ios-subhead ${isNative ? 'text-green-700' : 'text-blue-700'}`}>
                {isNative 
                  ? 'Running as native iOS app with full access to device capabilities'
                  : 'Running in web browser with limited native capabilities'
                }
              </p>
            </div>

            {isNative && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="ios-callout">Native Features Ready</span>
                  <span className="ios-callout text-primary">{readyFeatures}/{totalFeatures}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(readyFeatures / totalFeatures) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </IOSSection>

          {/* Feature List */}
          <IOSSection title="Device Capabilities">
            <IOSList>
              {features.map(feature => {
                const Icon = feature.icon;
                return (
                  <IOSListItem
                    key={feature.id}
                    interactive={!!feature.testAction && feature.isAvailable}
                    onClick={feature.testAction ? feature.testAction : undefined}
                    leadingIcon={
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-primary" />
                        {getStatusIcon(feature)}
                      </div>
                    }
                    trailingIcon={getStatusBadge(feature)}
                    subtitle={feature.description}
                  >
                    {feature.name}
                  </IOSListItem>
                );
              })}
            </IOSList>
          </IOSSection>

          {/* App Store Requirements */}
          <IOSSection title="App Store Requirements">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="ios-headline text-green-800 mb-2">✅ Minimum Functionality</h3>
                <p className="ios-subhead text-green-700">
                  App provides substantial native functionality beyond a mobile website including:
                </p>
                <ul className="mt-2 space-y-1 ios-caption text-green-700">
                  <li>• Camera integration for profile photos</li>
                  <li>• GPS location for locker finding</li>
                  <li>• Push notifications for order updates</li>
                  <li>• Haptic feedback for better UX</li>
                  <li>• Offline data caching</li>
                </ul>
              </div>

              {!isNative && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="ios-headline text-yellow-800 mb-2">⚠️ Testing in Browser</h3>
                  <p className="ios-subhead text-yellow-700">
                    Some features require native iOS environment. Export to GitHub and build with Xcode for full testing.
                  </p>
                </div>
              )}
            </div>
          </IOSSection>
        </IOSScrollView>
      </IOSContent>

      {/* Test All Action Sheet */}
      {showActionSheet && (
        <IOSActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title="Test Native Capabilities"
          description="This will test all available native features on your device"
          actions={[
            {
              label: 'Run All Tests',
              onClick: runAllTests,
              destructive: false
            }
          ]}
        />
      )}

      {/* Alert */}
      {showAlert && (
        <IOSAlert
          variant="info"
          title="Test Result"
          onDismiss={() => setShowAlert(null)}
        >
          {showAlert}
        </IOSAlert>
      )}
    </IOSScreen>
  );
}
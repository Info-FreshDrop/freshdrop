import React, { useState } from 'react';
import { IOSScreen, IOSContent } from '@/components/ui/ios-layout';
import { IOSHeader, IOSTabBar } from '@/components/ui/ios-navigation';
import { MobileHomepage } from '@/components/mobile/MobileHomepage';
import { AppStoreCompliance } from '@/components/mobile/AppStoreCompliance';
import { NativeCapabilities } from '@/components/mobile/NativeCapabilities';
import { OfflineMode } from '@/components/mobile/OfflineMode';
import { PrivacyCompliance } from '@/components/mobile/PrivacyCompliance';
import { AppValidationReport } from '@/components/validation/AppValidationReport';

export default function MobileTest() {
  const [currentTab, setCurrentTab] = useState('homepage');

  const tabs = [
    { id: 'homepage', label: 'Homepage', icon: 'Home' },
    { id: 'compliance', label: 'Compliance', icon: 'Shield' },
    { id: 'native', label: 'Native', icon: 'Smartphone' },
    { id: 'offline', label: 'Offline', icon: 'Download' },
    { id: 'privacy', label: 'Privacy', icon: 'Lock' }
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'homepage':
        return <MobileHomepage />;
      case 'compliance':
        return <AppStoreCompliance />;
      case 'native':
        return <NativeCapabilities />;
      case 'offline':
        return <OfflineMode />;
      case 'privacy':
        return <PrivacyCompliance />;
      default:
        return <MobileHomepage />;
    }
  };

  return (
    <IOSScreen>
      <IOSHeader title="iOS App Testing" />
      <IOSContent>
        {renderContent()}
      </IOSContent>
      <IOSTabBar
        tabs={tabs}
        activeTab={currentTab}
        onTabChange={setCurrentTab}
      />
    </IOSScreen>
  );
}
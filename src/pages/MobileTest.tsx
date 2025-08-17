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
    { id: 'homepage', label: 'Homepage', icon: <div>🏠</div>, onClick: () => setCurrentTab('homepage') },
    { id: 'compliance', label: 'Compliance', icon: <div>🛡️</div>, onClick: () => setCurrentTab('compliance') },
    { id: 'native', label: 'Native', icon: <div>📱</div>, onClick: () => setCurrentTab('native') },
    { id: 'offline', label: 'Offline', icon: <div>⬇️</div>, onClick: () => setCurrentTab('offline') },
    { id: 'privacy', label: 'Privacy', icon: <div>🔒</div>, onClick: () => setCurrentTab('privacy') }
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
      />
    </IOSScreen>
  );
}
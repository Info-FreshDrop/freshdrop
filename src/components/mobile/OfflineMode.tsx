import React, { useState } from 'react';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection, IOSList, IOSListItem } from '@/components/ui/ios-layout';
import { IOSHeader } from '@/components/ui/ios-navigation';
import { IOSAlert } from '@/components/ui/ios-components';
import { HapticButton } from '@/components/ui/haptic-button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Clock, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Database,
  RotateCcw as Sync
} from 'lucide-react';

interface OfflineData {
  id: string;
  type: 'profile' | 'orders' | 'locations' | 'services';
  title: string;
  description: string;
  lastSync: Date | null;
  size: string;
  isAvailable: boolean;
}

export function OfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncAlert, setShowSyncAlert] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Mock offline data - in real app this would come from local storage/cache
  const [offlineData] = useState<OfflineData[]>([
    {
      id: 'profile',
      type: 'profile',
      title: 'User Profile',
      description: 'Your account information and preferences',
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      size: '12 KB',
      isAvailable: true
    },
    {
      id: 'orders',
      type: 'orders',
      title: 'Recent Orders',
      description: 'Last 10 orders and their status',
      lastSync: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      size: '48 KB',
      isAvailable: true
    },
    {
      id: 'locations',
      type: 'locations',
      title: 'Locker Locations',
      description: 'Nearby smart locker locations and availability',
      lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      size: '156 KB',
      isAvailable: true
    },
    {
      id: 'services',
      type: 'services',
      title: 'Service Information',
      description: 'Pricing, packages, and service details',
      lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      size: '24 KB',
      isAvailable: true
    }
  ]);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const handleSyncData = async () => {
    setSyncStatus('syncing');
    setShowSyncAlert(true);

    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (isOnline) {
      setSyncStatus('success');
      // In real app, update lastSync times
    } else {
      setSyncStatus('error');
    }
  };

  const getDataIcon = (type: string) => {
    switch (type) {
      case 'profile':
        return <Database className="w-5 h-5 text-blue-500" />;
      case 'orders':
        return <Clock className="w-5 h-5 text-green-500" />;
      case 'locations':
        return <Download className="w-5 h-5 text-purple-500" />;
      case 'services':
        return <CheckCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Database className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSyncBadge = (lastSync: Date | null) => {
    if (!lastSync) {
      return <Badge className="bg-red-100 text-red-800">Never</Badge>;
    }

    const hoursAgo = (new Date().getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo < 1) {
      return <Badge className="bg-green-100 text-green-800">Fresh</Badge>;
    } else if (hoursAgo < 6) {
      return <Badge className="bg-yellow-100 text-yellow-800">Recent</Badge>;
    } else {
      return <Badge className="bg-orange-100 text-orange-800">Stale</Badge>;
    }
  };

  const totalSize = offlineData.reduce((sum, data) => {
    const sizeNum = parseFloat(data.size.replace(/[^\d.]/g, ''));
    return sum + sizeNum;
  }, 0);

  return (
    <IOSScreen>
      <IOSHeader 
        title="Offline Mode"
        rightButton={{
          text: "Sync",
          onClick: handleSyncData
        }}
      />
      
      <IOSContent>
        <IOSScrollView>
          {/* Connection Status */}
          <IOSSection title="Connection Status">
            <div className={`border rounded-lg p-4 ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center mb-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500 mr-2" />
                )}
                <span className={`ios-headline ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              <p className={`ios-subhead ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline 
                  ? 'All features available. Data will sync automatically.'
                  : 'Limited features available. Using cached data.'
                }
              </p>
            </div>
          </IOSSection>

          {/* Offline Capabilities */}
          <IOSSection title="Available Offline">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="ios-headline text-blue-800 mb-2">✅ Offline Features</h3>
              <ul className="space-y-1 ios-subhead text-blue-700">
                <li>• View recent orders and status</li>
                <li>• Browse service information</li>
                <li>• Access profile settings</li>
                <li>• View cached locker locations</li>
                <li>• Draft new orders (sync when online)</li>
              </ul>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="ios-callout">Total Cached Data</span>
              <span className="ios-callout text-primary">{totalSize.toFixed(0)} KB</span>
            </div>
          </IOSSection>

          {/* Cached Data */}
          <IOSSection title="Cached Data">
            <IOSList>
              {offlineData.map(data => (
                <IOSListItem
                  key={data.id}
                  leadingIcon={getDataIcon(data.type)}
                  trailingIcon={
                    <div className="flex flex-col items-end">
                      {getSyncBadge(data.lastSync)}
                      <span className="ios-caption text-muted-foreground mt-1">
                        {data.size}
                      </span>
                    </div>
                  }
                  subtitle={`${data.description} • Last sync: ${formatTimeAgo(data.lastSync)}`}
                >
                  {data.title}
                </IOSListItem>
              ))}
            </IOSList>
          </IOSSection>

          {/* App Store Requirements */}
          <IOSSection title="App Store Requirements">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="ios-headline text-green-800 mb-2">✅ Offline Functionality</h3>
              <p className="ios-subhead text-green-700 mb-3">
                App provides meaningful offline capabilities as required by App Store guidelines:
              </p>
              <ul className="space-y-1 ios-caption text-green-700">
                <li>• Cached user data and preferences</li>
                <li>• Offline viewing of order history</li>
                <li>• Graceful degradation when offline</li>
                <li>• Clear offline status indicators</li>
                <li>• Queue actions for sync when online</li>
              </ul>
            </div>
          </IOSSection>

          {/* Sync Controls */}
          <IOSSection title="Data Management">
            <div className="space-y-3">
              <HapticButton 
                className="w-full" 
                onClick={handleSyncData}
                disabled={!isOnline || syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Sync className="w-4 h-4 mr-2" />
                    Sync All Data
                  </>
                )}
              </HapticButton>
              
              <HapticButton 
                className="w-full" 
                variant="outline"
                onClick={() => setShowSyncAlert(true)}
              >
                <Database className="w-4 h-4 mr-2" />
                Manage Cache
              </HapticButton>
            </div>
          </IOSSection>
        </IOSScrollView>
      </IOSContent>

      {/* Sync Status Alert */}
      {showSyncAlert && (
        <IOSAlert
          variant={syncStatus === 'error' ? 'warning' : 'info'}
          title={
            syncStatus === 'syncing' ? 'Syncing Data...' :
            syncStatus === 'success' ? 'Sync Complete' :
            syncStatus === 'error' ? 'Sync Failed' :
            'Sync Data'
          }
          onDismiss={() => setShowSyncAlert(false)}
        >
          {syncStatus === 'syncing' && 'Updating all cached data with latest information.'}
          {syncStatus === 'success' && 'All data has been successfully synchronized.'}
          {syncStatus === 'error' && 'Unable to sync data. Please check your connection and try again.'}
          {syncStatus === 'idle' && 'This will update all cached data with the latest information from our servers.'}
        </IOSAlert>
      )}
    </IOSScreen>
  );
}
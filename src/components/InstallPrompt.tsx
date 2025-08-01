import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface InstallPromptProps {
  onDismiss?: () => void;
  className?: string;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ onDismiss, className }) => {
  const { isInstallable, installApp, canInstallIOS } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    setIsInstalling(false);
    
    if (success) {
      onDismiss?.();
    }
  };

  if (!isInstallable && !canInstallIOS) {
    return null;
  }

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Install FreshDrop</CardTitle>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          Get the best experience with our mobile app. Access your orders offline and receive push notifications.
        </CardDescription>
        
        {isInstallable ? (
          <Button 
            onClick={handleInstall} 
            disabled={isInstalling}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            {isInstalling ? 'Installing...' : 'Install App'}
          </Button>
        ) : canInstallIOS ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To install on iOS:
            </p>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">1</span>
                Tap the <Share className="h-4 w-4 inline" /> share button below
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">2</span>
                Scroll down and tap "Add to Home Screen"
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">3</span>
                Tap "Add" to confirm
              </li>
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// Hook to manage install prompt visibility
export const useInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isInstallable, isInstalled, canInstallIOS } = usePWA();

  React.useEffect(() => {
    // Show prompt if app is installable and not already installed
    const shouldShow = (isInstallable || canInstallIOS) && !isInstalled;
    
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      // Show again after 24 hours
      if (dismissedTime < oneDayAgo) {
        localStorage.removeItem('install-prompt-dismissed');
        setShowPrompt(shouldShow);
      }
    } else {
      setShowPrompt(shouldShow);
    }
  }, [isInstallable, isInstalled, canInstallIOS]);

  const dismissPrompt = React.useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  }, []);

  return {
    showPrompt,
    dismissPrompt
  };
};
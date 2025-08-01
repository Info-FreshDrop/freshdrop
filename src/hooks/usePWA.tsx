import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { toast } = useToast();

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      const isInWebAppiOS = window.navigator.standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      setIsInstalled(isInWebAppiOS || isInWebAppChrome);
    };

    checkInstalled();
    window.addEventListener('appinstalled', checkInstalled);
    return () => window.removeEventListener('appinstalled', checkInstalled);
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "No Internet Connection",
        description: "You're offline. Some features may not work.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Install the app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        toast({
          title: "App Installed",
          description: "FreshDrop has been installed successfully!",
        });
        return true;
      }
    } catch (error) {
      console.error('Error installing app:', error);
      toast({
        title: "Installation Failed",
        description: "Could not install the app. Please try again.",
        variant: "destructive",
      });
    }
    
    return false;
  }, [deferredPrompt, toast]);

  // Get iOS install instructions
  const getIOSInstallInstructions = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    return isIOS && isSafari;
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
    canInstallIOS: getIOSInstallInstructions(),
    supportsNotifications: 'Notification' in window,
    supportsPWA: 'serviceWorker' in navigator
  };
};
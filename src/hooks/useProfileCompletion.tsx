import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  created_at: string;
  tax_id?: string;
  tax_address?: any;
  w9_completed?: boolean;
  is_contractor?: boolean;
  business_name?: string;
  contractor_start_date?: string;
}

export function useProfileCompletion() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  const checkProfileCompletion = async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfileLoading(false);
        return;
      }

      setProfile(data);

      // Check if profile is incomplete
      const isNewUser = !data;
      const isIncomplete = data && (
        !data.first_name?.trim() || 
        !data.last_name?.trim() || 
        !data.phone?.trim() || 
        !data.email?.trim()
      );

      // Check if user signed up recently (within last 24 hours) or has incomplete profile
      let shouldPrompt = false;
      
      if (isNewUser) {
        // New user without profile - always prompt
        shouldPrompt = true;
      } else if (isIncomplete) {
        // Existing user with incomplete profile
        const createdAt = new Date(data.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        // Show prompt if profile was created recently (within 7 days) and is incomplete
        shouldPrompt = hoursSinceCreation < 168; // 7 days = 168 hours
      }

      // Check localStorage to see if user has dismissed the prompt recently
      const dismissedKey = `profile_prompt_dismissed_${user.id}`;
      const dismissedTime = localStorage.getItem(dismissedKey);
      
      if (dismissedTime) {
        const dismissed = new Date(dismissedTime);
        const hoursSinceDismissed = (new Date().getTime() - dismissed.getTime()) / (1000 * 60 * 60);
        
        // Don't show again if dismissed within last 24 hours (unless profile is completely empty)
        if (hoursSinceDismissed < 24 && !isNewUser) {
          shouldPrompt = false;
        }
      }

      setShouldShowPrompt(shouldPrompt);
      setProfileLoading(false);
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      checkProfileCompletion();
    } else if (!authLoading && !user) {
      setProfileLoading(false);
      setShouldShowPrompt(false);
    }
  }, [user, authLoading]);

  const markPromptCompleted = () => {
    setShouldShowPrompt(false);
    // Refresh profile data
    if (user) {
      checkProfileCompletion();
    }
  };

  const dismissPrompt = () => {
    setShouldShowPrompt(false);
    if (user) {
      // Store dismissal time in localStorage
      const dismissedKey = `profile_prompt_dismissed_${user.id}`;
      localStorage.setItem(dismissedKey, new Date().toISOString());
    }
  };

  const isProfileComplete = (profileData?: Profile | null) => {
    const data = profileData || profile;
    return data && 
           data.first_name?.trim() && 
           data.last_name?.trim() && 
           data.phone?.trim() && 
           data.email?.trim();
  };

  // Check if user needs contractor setup
  const needsContractorSetup = async () => {
    if (!user || !profile) return false;
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isOperator = userRoles?.some(r => r.role === 'operator' || r.role === 'washer');
    
    if (!isOperator) return false;
    
    const { data: washer } = await supabase
      .from('washers')
      .select('bank_account_info')
      .eq('user_id', user.id)
      .maybeSingle();
      
    return !(
      profile?.tax_id && 
      profile?.tax_address && 
      profile?.w9_completed &&
      profile?.is_contractor &&
      washer?.bank_account_info
    );
  };

  return {
    profile,
    shouldShowPrompt,
    profileLoading,
    isProfileComplete,
    markPromptCompleted,
    dismissPrompt,
    refreshProfile: checkProfileCompletion,
    needsContractorSetup
  };
}

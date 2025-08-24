import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOperatorOnboarding() {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is an operator
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setUserRole(roleData?.role || null);

        // If user is an operator, check if they need onboarding
        if (roleData?.role === 'operator') {
          // Check user metadata for onboarding flag
          const needsOnboardingFromMeta = user.user_metadata?.needs_onboarding === true;
          
          // Check if washer profile has ACH verified and is approved
          const { data: washerData } = await supabase
            .from('washers')
            .select('ach_verified, approval_status, user_id')
            .eq('user_id', user.id)
            .single();

          // Check if profile is complete
          const { data: profileData } = await supabase
            .from('profiles')
            .select('w9_completed, is_contractor')
            .eq('user_id', user.id)
            .single();

          const needsOnboarding = needsOnboardingFromMeta || 
                                !washerData?.ach_verified || 
                                washerData?.approval_status !== 'approved' ||
                                !profileData?.w9_completed ||
                                profileData?.is_contractor !== true;

          setNeedsOnboarding(needsOnboarding);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [user]);

  const completeOnboarding = async () => {
    if (!user) return false;

    try {
      // Update user metadata to remove onboarding flag
      const { error: updateError } = await supabase.auth.updateUser({
        data: { needs_onboarding: false }
      });

      if (updateError) throw updateError;

      // Mark washer as ACH verified and approved
      await supabase
        .from('washers')
        .update({ 
          ach_verified: true,
          approval_status: 'approved'
        })
        .eq('user_id', user.id);

      setNeedsOnboarding(false);
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  };

  return {
    needsOnboarding,
    userRole,
    loading,
    completeOnboarding
  };
}
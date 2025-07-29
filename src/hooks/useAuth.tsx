import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'customer' | 'washer' | 'operator' | 'owner' | 'marketing';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (!roleError && data && data.length > 0) {
        const roles = data.map(r => r.role);
        let primaryRole: UserRole = 'customer';
        
        if (roles.includes('owner')) {
          primaryRole = 'owner';
        } else if (roles.includes('marketing')) {
          primaryRole = 'marketing';
        } else if (roles.includes('operator')) {
          primaryRole = 'operator';
        } else if (roles.includes('washer')) {
          primaryRole = 'washer';
        }
        
        setUserRole(primaryRole);
        console.log('User role set to:', primaryRole);
        return primaryRole;
      }
    } catch (roleError) {
      console.error('Role fetch error:', roleError);
    }
    
    // Fallback to customer role
    setUserRole('customer');
    return 'customer';
  };

  useEffect(() => {
    console.log('Auth effect started');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent potential deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', !!session, error);
      
      if (error) {
        console.error('Session error:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).finally(() => setLoading(false));
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

    // If signup is successful and there's a referral code, handle it
    if (!error && metadata?.referral_code) {
      setTimeout(async () => {
        await handleReferralCode(metadata.referral_code);
      }, 2000); // Delay to ensure user creation is complete
    }

    return { error };
  };

  const handleReferralCode = async (referralCode: string) => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the referral code
      const { data: refCode, error: refError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', referralCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (refError || !refCode) {
        console.error('Referral code not found:', referralCode);
        return;
      }

      // Check if the referrer is different from the new user
      if (refCode.user_id === user.id) {
        console.error('Cannot use your own referral code');
        return;
      }

      // Check if this user already used a referral code
      const { data: existingUse } = await supabase
        .from('referral_uses')
        .select('id')
        .eq('referred_user_id', user.id)
        .single();

      if (existingUse) {
        console.error('User already used a referral code');
        return;
      }

      // Create referral use record
      await supabase.from('referral_uses').insert({
        referral_code_id: refCode.id,
        referrer_user_id: refCode.user_id,
        referred_user_id: user.id,
        reward_given_cents: refCode.reward_amount_cents
      });

      // Update referral code usage count
      await supabase
        .from('referral_codes')
        .update({ 
          usage_count: refCode.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', refCode.id);

      console.log('Referral code processed successfully');
    } catch (error) {
      console.error('Error processing referral code:', error);
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
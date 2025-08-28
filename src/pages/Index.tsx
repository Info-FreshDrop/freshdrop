import { Homepage } from "@/components/Homepage";
import { MobileApp } from "@/components/mobile/MobileApp";
import { AppStoreAssets } from "@/components/mobile/AppStoreAssets";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { OperatorDashboard } from "@/components/dashboards/OperatorDashboard";

const Index = () => {
  const { user, userRole, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auto-redirect operators to their dashboard
    if (userRole === 'operator') {
      // Don't navigate, just show the operator dashboard
    }
  }, [userRole, navigate]);

  // Show app store assets page
  if (location.pathname === '/mobile-test') {
    return <AppStoreAssets />;
  }

  // Show operator dashboard if user is an operator
  if (userRole === 'operator') {
    return <OperatorDashboard />;
  }

  // For unauthenticated users, show mobile-first app on mobile devices
  if (!user && isMobile) {
    return <MobileApp />;
  }

  return (
    <div className="min-h-screen bg-gradient-wave relative">
      {/* Auth Navigation */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </span>
            <button 
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="bg-white/90 backdrop-blur-sm text-primary px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/auth">
            <button className="bg-white/90 backdrop-blur-sm text-primary px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors">
              Sign In
            </button>
          </Link>
        )}
      </div>
      
      {/* Owner Dashboard Link */}
      {user && userRole === 'owner' && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <Link to="/owner-dashboard">
            <button className="bg-white/90 backdrop-blur-sm text-primary px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-lg hover:bg-white transition-colors">
              Dashboard
            </button>
          </Link>
        </div>
      )}
      
      <Homepage />
    </div>
  );
};

export default Index;
import { Homepage } from "@/components/Homepage";
import { AppStoreAssets } from "@/components/mobile/AppStoreAssets";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { OperatorDashboard } from "@/components/dashboards/OperatorDashboard";

const Index = () => {
  const { user, userRole } = useAuth();
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

  return (
    <div className="min-h-screen bg-gradient-wave relative">
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
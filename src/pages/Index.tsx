import { Homepage } from "@/components/Homepage";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OperatorDashboard } from "@/components/dashboards/OperatorDashboard";

const Index = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect operators to their dashboard
    if (userRole === 'operator') {
      // Don't navigate, just show the operator dashboard
    }
  }, [userRole, navigate]);

  // Show operator dashboard if user is an operator
  if (userRole === 'operator') {
    return <OperatorDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-wave relative">
      {/* Owner Dashboard Link */}
      {user && userRole === 'owner' && (
        <div className="absolute top-4 right-4 z-10">
          <Link to="/owner-dashboard">
            <button className="bg-white/90 backdrop-blur-sm text-primary px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors">
              Owner Dashboard
            </button>
          </Link>
        </div>
      )}
      
      <Homepage />
    </div>
  );
};

export default Index;
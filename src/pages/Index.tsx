import { Homepage } from "@/components/Homepage";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

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
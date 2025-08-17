import { useState, useEffect } from "react";
import { MobileHomepage } from "./mobile/MobileHomepage";
import { CustomerDashboard } from "./dashboards/CustomerDashboard";
import { OwnerDashboard } from "./dashboards/OwnerDashboard";
import { OperatorDashboard } from "./dashboards/OperatorDashboard";
import { MarketingDashboard } from "./dashboards/MarketingDashboard";
import { WasherDashboard } from "./washers/WasherDashboard";
import { FullScreenLoader } from "./LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

export function Homepage() {
  const [timeoutReached, setTimeoutReached] = useState(false);
  const { user, userRole, loading } = useAuth();

  // Always use iOS-native design for complete App Store readiness
  return <MobileHomepage />;
}
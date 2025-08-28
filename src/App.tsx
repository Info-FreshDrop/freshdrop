
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import Index from "./pages/Index";
import OwnerDashboard from "./pages/OwnerDashboard";
import MarketingDashboard from "./pages/MarketingDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import OperatorSignup from "./pages/OperatorSignup";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Auth from "./pages/Auth";
import Support from "./pages/Support";
import { ProfileCompletionPrompt } from "./components/ProfileCompletionPrompt";
import { useProfileCompletion } from "./hooks/useProfileCompletion";
import { useOperatorOnboarding } from "./hooks/useOperatorOnboarding";
import OperatorOnboardingModal from "./components/operator/OperatorOnboardingModal";

import "./App.css";

const queryClient = new QueryClient();

// Create a separate component that uses the profile completion hook
function AppContent() {
  const { shouldShowPrompt, markPromptCompleted, dismissPrompt } = useProfileCompletion();
  const { needsOnboarding, userRole, completeOnboarding } = useOperatorOnboarding();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/marketing-dashboard" element={<MarketingDashboard />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/operator-signup" element={<OperatorSignup />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/support" element={<Support />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Operator Onboarding Modal */}
      {userRole === 'operator' && (
        <OperatorOnboardingModal
          isOpen={needsOnboarding}
          onComplete={completeOnboarding}
        />
      )}
      
      {/* Profile Completion Prompt */}
      {!needsOnboarding && (
        <ProfileCompletionPrompt
          isOpen={shouldShowPrompt}
          onComplete={markPromptCompleted}
          onSkip={dismissPrompt}
        />
      )}
    </>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SecurityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </SecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

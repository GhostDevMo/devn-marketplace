import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProfessionalDashboard from "@/pages/professional-dashboard";
import Professionals from "@/pages/professionals";
import ProfessionalProfile from "@/pages/professional-profile";
import MyProfile from "@/pages/my-profile";
import Bookings from "@/pages/bookings";
import BookingDetails from "@/pages/booking-details";
import Profile from "@/pages/profile";
import Checkout from "@/pages/checkout";
import BookingConfirmation from "@/pages/booking-confirmation";
import Payout from "@/pages/payout";
import PendingRequests from "@/pages/pending-requests";
import ConfirmedAppointments from "@/pages/confirmed-appointments";
import Availability from "@/pages/availability";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import MobileNav from "@/components/mobile-nav";
import ClientHeader from "@/components/client-header";
import HelpChatBubble from "@/components/help-chat-bubble";
import AdminHelpInbox from "@/pages/admin-help-inbox";
import Inbox from "@/pages/inbox";
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() !== 'web') {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setBackgroundColor({ color: '#ffffff' });
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show dashboard for authenticated clients
  const ClientHome = () => {
    return <Dashboard />;
  };
  
  // Show dashboard for authenticated professionals
  const ProfessionalHome = () => {
    return <ProfessionalDashboard />;
  };

  const HomeComponent = user?.role === 'professional' ? ProfessionalHome : ClientHome;

  // Don't show 404 while authentication is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? HomeComponent : Auth} />
      <Route path="/auth" component={Auth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      {isAuthenticated && (
        <>
          <Route path="/professional-dashboard" component={ProfessionalDashboard} />
          <Route path="/pending-requests" component={PendingRequests} />
          <Route path="/confirmed-appointments" component={ConfirmedAppointments} />
          <Route path="/availability" component={Availability} />
          <Route path="/payout" component={Payout} />
          <Route path="/professionals" component={Professionals} />
          <Route path="/professionals/:serviceSlug" component={Professionals} />
          <Route path="/professional/:id" component={ProfessionalProfile} />
          <Route path="/my-profile" component={MyProfile} />
          <Route path="/profile" component={Profile} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/booking/:bookingId" component={BookingDetails} />
          <Route path="/checkout/:bookingId" component={Checkout} />
          <Route path="/booking-confirmation/:bookingId" component={BookingConfirmation} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/admin/help-inbox" component={AdminHelpInbox} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const showMobileNav = !isLoading && isAuthenticated && location !== "/auth";
  const showHeader = !isLoading && isAuthenticated && location !== "/auth";

  return (
    <div className="app-root">
      {showHeader && <ClientHeader />}

      <main className="app-main">
        <Router />
      </main>

      {showMobileNav && <MobileNav />}
      <HelpChatBubble />
    </div>
  );
}

function MobileInitializer() {
  useEffect(() => {
    // Initialize mobile app features only when running in mobile environment
    const initializeMobile = async () => {
      try {
        // Check if we're running in a mobile environment (Capacitor)
        const isCapacitor = window.location.protocol === 'capacitor:' || 
                           (window.location.hostname === 'localhost' && window.navigator.userAgent.includes('Mobile'));

        if (isCapacitor) {
          // Check if Capacitor modules are available
          if ((window as any).Capacitor) {
            // Mobile functionality is handled by Capacitor plugins
            console.log('Capacitor environment detected');
            // Note: Capacitor-specific functionality would be handled here
            // when the app is built for mobile platforms
          }
        }
      } catch (error) {
        console.log('Mobile initialization error:', error);
      }
    };

    let cleanup: (() => void) | undefined;
    initializeMobile().then((cleanupFn) => {
      cleanup = cleanupFn as (() => void) | undefined;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const { isConnected } = useNetworkStatus();

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-opacity ${
      isConnected ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        No internet connection
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MobileInitializer />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
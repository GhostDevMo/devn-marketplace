import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";
import { useLocation } from "wouter";
import ServiceGuideModal from "@/components/service-guide-modal";
import NotificationBell from "@/components/notification-bell";
import { HelpCircle, Inbox, MessageSquare } from "lucide-react";

export default function ClientHeader() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.firstName) return user.firstName[0];
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    window.location.href = '/';
  };

  const handleLogoClick = () => {
    navigate('/');
  };

return (
  <>
    <ServiceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <img src={logoImage} alt="Devn Logo" className="h-10 w-10 rounded-lg" />
          </div>

          <div className="flex items-center space-x-3">
            {user?.email === "detolakinbi@gmail.com" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/help-inbox")}
                className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Inbox className="w-4 h-4" />
                <span className="hidden sm:inline">Support Inbox</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inbox")}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Inbox</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[#3A6B47] hover:text-[#2d5538] hover:bg-green-50"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Find Help</span>
            </Button>

            <NotificationBell />

            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {getInitials()}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}

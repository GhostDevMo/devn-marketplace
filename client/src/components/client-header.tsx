import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";
import { useLocation } from "wouter";

export default function ClientHeader() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

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
    <div className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <img src={logoImage} alt="Devn Logo" className="h-10 w-10 rounded-lg" />
          </div>
          <div className="flex items-center space-x-3">
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
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Calendar, User, HelpCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ServiceGuideModal from "@/components/service-guide-modal";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [guideOpen, setGuideOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    {
      path: user?.role === 'professional' ? '/professional-dashboard' : '/',
      label: 'Home',
      icon: Home,
    },
    {
      path: '/bookings',
      label: 'Bookings',
      icon: Calendar,
    },
    {
      path: user?.role === 'professional' ? '/my-profile' : '/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <>
      <ServiceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <div className="mobile-nav">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`flex flex-col items-center p-2 h-auto min-h-[60px] ${
                    active ? 'text-primary' : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          {/* FAQ / Find Help — only for clients */}
          {user?.role === 'client' && (
            <Button
              variant="ghost"
              onClick={() => setGuideOpen(true)}
              className="flex flex-col items-center p-2 h-auto min-h-[60px] text-[#3A6B47] hover:text-[#2d5538]"
            >
              <HelpCircle className="w-5 h-5 mb-1" />
              <span className="text-xs">Find Help</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

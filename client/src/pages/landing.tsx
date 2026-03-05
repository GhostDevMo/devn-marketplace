import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";

export default function Landing() {
  const [, navigate] = useLocation();

  const handleNewUser = () => {
    window.location.href = '/auth?tab=register';
  };

  const handleReturningUser = () => {
    window.location.href = '/auth?tab=login';
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="Devn Logo" className="w-32 h-32 mx-auto rounded-lg" />
          </div>
          <p className="text-white text-lg">Where Financial Literacy Meets Accessibility</p>
        </div>

        {/* User Selection Card */}
        <Card className="bg-white rounded-2xl shadow-2xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Button
                onClick={handleNewUser}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold transition-colors shadow-lg"
                data-testid="button-new-user"
              >
                New User
              </Button>
              
              <Button
                onClick={handleReturningUser}
                className="w-full bg-white text-primary border-2 border-primary py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
                data-testid="button-returning-user"
              >
                Returning User
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

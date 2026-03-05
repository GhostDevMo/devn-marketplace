import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Users, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function ProfessionalProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch professional profile for current user
  const { data: professional, isLoading, error } = useQuery({
    queryKey: ['/api/professional/profile'],
    enabled: !!isAuthenticated && user?.role === "professional",
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/professional/profile', { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Professional profile not found');
        }
        throw new Error('Failed to fetch professional profile');
      }
      return res.json();
    },
  });

  // Redirect to complete profile if needed
  if (error && error.message.includes('not found')) {
    toast({
      title: "Complete Your Professional Profile",
      description: "Please complete your professional registration to continue.",
      variant: "default",
    });
    setTimeout(() => {
      window.location.href = "/auth?role=professional";
    }, 2000);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Redirecting to complete your profile...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Profile</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load professional profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/professional-dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Professional Profile</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {(user?.firstName || 'U').charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user?.firstName || 'User'} {user?.lastName || ''}
                    </h1>
                    <p className="text-lg text-primary font-medium">{professional.title}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">
                          {professional.averageRating || "New"}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          ({professional.totalClients || 0} clients)
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{professional.experience || 0} years exp.</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${professional.hourlyRate}/hr
                    </div>
                    {professional.isVerified && (
                      <Badge variant="default" className="mt-1">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Section */}
        {professional.bio && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">About</h3>
              <p className="text-gray-700">{professional.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Professional Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.totalClients || 0}</div>
                <div className="text-sm text-gray-600">Total Clients</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.totalSessions || 0}</div>
                <div className="text-sm text-gray-600">Sessions Completed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.experience || 0}</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
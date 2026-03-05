import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock, DollarSign, Users, CheckCircle, XCircle } from "lucide-react";

export default function ProfessionalDashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Check for token in URL params (from OAuth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      // Clean up URL by removing token parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Invalidate auth query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch professional bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['/api/professional/bookings'],
    enabled: !!isAuthenticated,
  });

  // Fetch professional profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['/api/professional/profile'],
    enabled: !!isAuthenticated,
  });

  // Check if professional profile exists
  const hasNoProfile = profileError && !profileLoading;

  // Track which booking is being processed
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  // Mutation to accept/decline bookings
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, action }: { bookingId: string; action: 'accept' | 'decline' }) => {
      const status = action === 'accept' ? 'confirmed' : 'cancelled';
      const response = await apiRequest("PATCH", `/api/booking/${bookingId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional/bookings'] });
      toast({
        title: variables.action === 'accept' ? "Request Accepted" : "Request Declined",
        description: `Booking has been ${variables.action === 'accept' ? 'confirmed' : 'cancelled'}.`,
      });
      setProcessingBookingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
      setProcessingBookingId(null);
    },
  });

  const handleBookingAction = (bookingId: string, action: 'accept' | 'decline') => {
    setProcessingBookingId(bookingId);
    updateBookingMutation.mutate({ bookingId, action });
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show setup prompt if no profile
  if (hasNoProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Complete Your Professional Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              You need to set up your professional profile before you can access your dashboard and receive booking requests.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth?tab=register&role=professional'}
              className="w-full"
            >
              Complete Profile Setup
            </Button>
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingBookings = bookings?.filter((booking: any) => booking.status === 'pending') || [];
  const confirmedBookings = bookings?.filter((booking: any) => booking.status === 'confirmed') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Professional Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your appointments and profile.</p>
          </div>
          <Link href="/payout">
            <Button
              variant="default"
              className="flex items-center gap-2"
              data-testid="button-view-earnings"
            >
              <DollarSign className="h-4 w-4" />
              Earnings
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
          <Link href="/professionals">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                    <p className="text-2xl font-bold">{profile?.totalClients || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bookings">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold">{profile?.totalSessions || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pending-requests">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold">{pendingBookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Appointment Requests */}
          <Card className="overflow-hidden">
            <Link href="/pending-requests">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Pending Requests ({pendingBookings.length})
                  </CardTitle>
                  <span className="text-sm text-primary font-medium hover:underline">
                    View All →
                  </span>
                </div>
              </CardHeader>
            </Link>
            <CardContent>
              {bookingsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : pendingBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {booking.client.firstName} {booking.client.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{booking.service.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(booking.scheduledAt).toLocaleDateString()} at{' '}
                            {new Date(booking.scheduledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          ${booking.amount}
                        </Badge>
                      </div>
                      
                      {booking.specialRequests && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Note:</strong> {booking.specialRequests}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBookingAction(booking.id, 'accept')}
                          disabled={processingBookingId === booking.id}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {processingBookingId === booking.id ? 'Processing...' : 'Accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookingAction(booking.id, 'decline')}
                          disabled={processingBookingId === booking.id}
                          className="flex items-center gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmed Appointments */}
          <Card className="overflow-hidden">
            <Link href="/confirmed-appointments">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Confirmed Appointments ({confirmedBookings.length})
                  </CardTitle>
                  <span className="text-sm text-primary font-medium hover:underline">
                    View All →
                  </span>
                </div>
              </CardHeader>
            </Link>
            <CardContent>
              {bookingsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : confirmedBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No confirmed appointments</p>
              ) : (
                <div className="space-y-4">
                  {confirmedBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {booking.client.firstName} {booking.client.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{booking.service.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(booking.scheduledAt).toLocaleDateString()} at{' '}
                            {new Date(booking.scheduledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge variant="default">
                          ${booking.amount}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageSquare } from "lucide-react";
import ClientHeader from "@/components/client-header";

export default function ConfirmedAppointments() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to view confirmed appointments.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch professional bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['/api/professional/bookings'],
    enabled: !!isAuthenticated,
  });

  const confirmedBookings = bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'completed') || [];

  // Helper to check if chat is available (30 min before to 30 min after)
  const isChatAvailable = (scheduledAt: string) => {
    const now = new Date();
    const sessionTime = new Date(scheduledAt);
    const thirtyMinBefore = new Date(sessionTime.getTime() - 30 * 60 * 1000);
    const thirtyMinAfter = new Date(sessionTime.getTime() + 30 * 60 * 1000);
    return now >= thirtyMinBefore && now <= thirtyMinAfter;
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/professional-dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Confirmed Appointments</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Your Confirmed Appointments ({confirmedBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ) : confirmedBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No confirmed appointments</p>
                <p className="text-gray-400 text-sm mt-2">Accepted appointments will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedBookings.map((booking: any) => (
                  <div key={booking.id} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {booking.client.firstName} {booking.client.lastName}
                          </h3>
                          {booking.status === 'completed' && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{booking.service.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(booking.scheduledAt).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at{' '}
                          {new Date(booking.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {booking.client.email && (
                          <p className="text-sm text-gray-500 mt-1">
                            Email: {booking.client.email}
                          </p>
                        )}
                      </div>
                      <Badge variant="default" className="text-lg px-3 py-1">
                        ${booking.amount}
                      </Badge>
                    </div>

                    {booking.specialRequests && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded mb-3">
                        <strong className="text-gray-700">Client Note:</strong>
                        <p className="mt-1">{booking.specialRequests}</p>
                      </div>
                    )}

                    {/* Chat button if available */}
                    {isChatAvailable(booking.scheduledAt) && (
                      <Link href={`/booking/${booking.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-2"
                          data-testid={`button-chat-${booking.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Join Session Chat
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

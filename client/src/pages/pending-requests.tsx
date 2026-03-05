import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import ClientHeader from "@/components/client-header";

export default function PendingRequests() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to view pending requests.",
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

  // Mutation to accept/decline bookings
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, action }: { bookingId: string; action: 'accept' | 'decline' }) => {
      const status = action === 'accept' ? 'confirmed' : 'cancelled';
      const response = await apiRequest("PATCH", `/api/booking/${bookingId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/professional/profile'] });
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

  const pendingBookings = bookings?.filter((b: any) => b.status === 'pending') || [];

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
              <h1 className="text-xl font-bold text-gray-900">Pending Requests</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Pending Appointment Requests ({pendingBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending requests</p>
                <p className="text-gray-400 text-sm mt-2">New appointment requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((booking: any) => (
                  <div key={booking.id} className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {booking.client.firstName} {booking.client.lastName}
                        </h3>
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
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        ${booking.amount}
                      </Badge>
                    </div>
                    
                    {booking.specialRequests && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <strong className="text-gray-700">Client Note:</strong>
                        <p className="mt-1">{booking.specialRequests}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleBookingAction(booking.id, 'accept')}
                        disabled={processingBookingId === booking.id}
                        className="flex items-center gap-1 flex-1"
                        data-testid={`button-accept-${booking.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        {processingBookingId === booking.id ? "Processing..." : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBookingAction(booking.id, 'decline')}
                        disabled={processingBookingId === booking.id}
                        className="flex items-center gap-1 flex-1"
                        data-testid={`button-decline-${booking.id}`}
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
      </div>
    </div>
  );
}

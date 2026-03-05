import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import BookingChat from "@/components/booking-chat";
import ClientHeader from "@/components/client-header";

export default function BookingDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  
  // Extract bookingId from URL
  const bookingId = location.split("/")[2];

  const { data: booking, isLoading: bookingLoading, error } = useQuery({
    queryKey: [`/api/booking/${bookingId}`],
    enabled: !!isAuthenticated && !!bookingId,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect via useEffect
  }

  if (isLoading || bookingLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-4"></div>
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Booking not found
              </h2>
              <p className="text-gray-600 mb-4">
                The booking you're looking for doesn't exist or you don't have access to it.
              </p>
              <Link href="/bookings">
                <Button>Back to Bookings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Determine if current user is the client
  const isClient = user?.id === booking.clientId;
  const otherParty = isClient ? booking.professional.user : booking.client;

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/bookings">
              <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Booking Details</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Booking Information</span>
                  {getStatusBadge(booking.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Service</h3>
                  <p className="text-base text-gray-900">{booking.service.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    {isClient ? "Professional" : "Client"}
                  </h3>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        otherParty.profileImageUrl ||
                        `https://ui-avatars.com/api/?name=${otherParty.firstName}+${otherParty.lastName}&background=2563eb&color=fff`
                      }
                      alt={`${otherParty.firstName} ${otherParty.lastName}`}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="text-base text-gray-900">
                        {otherParty.firstName} {otherParty.lastName}
                      </p>
                      {otherParty.email && (
                        <p className="text-sm text-gray-500">{otherParty.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Scheduled Time
                  </h3>
                  <p className="text-base text-gray-900">
                    {format(new Date(booking.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-sm text-gray-500">
                    Duration: {booking.sessionDuration} hour{booking.sessionDuration > 1 ? 's' : ''}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Amount
                  </h3>
                  <p className="text-base text-gray-900">${parseFloat(booking.amount).toFixed(2)}</p>
                </div>

                {booking.specialRequests && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Special Requests</h3>
                    <p className="text-base text-gray-900">{booking.specialRequests}</p>
                  </div>
                )}

                {booking.meetingLink && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Meeting Link</h3>
                    <a
                      href={booking.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Chat</h2>
            <BookingChat bookingId={bookingId} currentUserId={user?.id || ""} />
          </div>
        </div>
      </div>
    </div>
  );
}

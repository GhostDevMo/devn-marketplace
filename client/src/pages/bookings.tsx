import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Calendar } from "lucide-react";
import { Link } from "wouter";
import ClientHeader from "@/components/client-header";
import type { Professional, User, Service } from "@shared/schema";

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  duration?: number;
  amount: string;
  professionalAmount?: string;
  client?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  professional?: {
    user?: {
      firstName: string;
      lastName: string;
      profileImageUrl?: string;
    };
  };
  service: {
    name: string;
  };
}

export default function Bookings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  // Use different endpoint based on user role
  const bookingsEndpoint = user?.role === 'professional' ? '/api/professional/bookings' : '/api/bookings';
  
  const { data: bookings = [], isLoading: bookingsLoading, error } = useQuery<Booking[]>({
    queryKey: [bookingsEndpoint],
    enabled: !!isAuthenticated,
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

  if (isLoading || bookingsLoading) {
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

  const bookingsList = bookings || [];

  // Include pending and confirmed bookings in upcoming, even if date is in the past
  const upcomingBookings = bookingsList.filter(b => 
    ['pending', 'confirmed'].includes(b.status) && b.status !== 'completed' && b.status !== 'cancelled'
  );
  const completedBookings = bookingsList.filter(b => b.status === 'completed');
  const cancelledBookings = bookingsList.filter(b => b.status === 'cancelled');

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

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const isToday = date.toDateString() === new Date().toDateString();
    const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
    
    let dateStr = date.toLocaleDateString();
    if (isToday) dateStr = 'Today';
    else if (isTomorrow) dateStr = 'Tomorrow';
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} at ${timeStr}`;
  };

  const renderBookingList = (bookingList: Booking[]) => {
    if (!bookingList || bookingList.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab} bookings
          </h3>
          <p className="text-gray-600">
            {activeTab === 'upcoming' && "You don't have any upcoming sessions."}
            {activeTab === 'completed' && "You haven't completed any sessions yet."}
            {activeTab === 'cancelled' && "You don't have any cancelled bookings."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {bookingList.map((booking) => (
          <Link key={booking.id} href={`/booking/${booking.id}`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center mb-4 md:mb-0">
                    <img
                      src={
                        booking.professional?.user?.profileImageUrl ||
                        booking.client?.profileImageUrl ||
                        `https://ui-avatars.com/api/?name=${
                          booking.professional?.user
                            ? `${booking.professional.user.firstName}+${booking.professional.user.lastName}`
                            : booking.client
                            ? `${booking.client.firstName}+${booking.client.lastName}`
                            : 'User'
                        }&background=2563eb&color=fff`
                      }
                      alt={
                        booking.professional?.user
                          ? `${booking.professional.user.firstName} ${booking.professional.user.lastName}`
                          : booking.client
                          ? `${booking.client.firstName} ${booking.client.lastName}`
                          : 'User'
                      }
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.professional?.user
                          ? `${booking.professional.user.firstName} ${booking.professional.user.lastName}`
                          : booking.client
                          ? `${booking.client.firstName} ${booking.client.lastName}`
                          : 'User'}
                      </h3>
                      <p className="text-sm text-primary font-medium">{booking.service.name}</p>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDateTime(booking.scheduledAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="ml-1 font-mono text-gray-900">{booking.id.slice(0, 8)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-1 text-gray-900">{booking.duration || 60} minutes</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="ml-1 text-gray-900 font-medium">${booking.amount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4 md:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming ({upcomingBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Completed ({completedBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cancelled'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cancelled ({cancelledBookings.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upcoming' && renderBookingList(upcomingBookings)}
        {activeTab === 'completed' && renderBookingList(completedBookings)}
        {activeTab === 'cancelled' && renderBookingList(cancelledBookings)}
      </div>
    </div>
  );
}

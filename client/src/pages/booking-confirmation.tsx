import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, Video, CreditCard, Receipt, Home } from "lucide-react";
import { Link, useParams } from "wouter";
import ClientHeader from "@/components/client-header";
import Layout from "@/components/Layout";

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: booking, isLoading: bookingLoading, error } = useQuery({
    queryKey: [`/api/booking/${bookingId}`],
    enabled: !!isAuthenticated && !!bookingId,
    queryFn: async () => {
      const res = await fetch(`/api/booking/${bookingId}`);
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
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

  useEffect(() => {
  document.body.style.overflow = "hidden";
  document.body.style.overflowX = "hidden";

  return () => {
    document.body.style.overflow = "";
    document.body.style.overflowX = "";
  };
}, []);

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect via useEffect
  }

  if (isLoading || bookingLoading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      })
    };
  };

  const { date, time } = formatDateTime(booking.scheduledAt);
return (
  <Layout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success Animation Container */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your booking request has been submitted and payment processed. The professional will review and confirm your session.</p>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h2>
            
            <div className="flex items-center mb-6">
              <img
                src={
                  booking.professional.user.profileImageUrl ||
                  `https://ui-avatars.com/api/?name=${booking.professional.user.firstName}+${booking.professional.user.lastName}&background=2563eb&color=fff`
                }
                alt={`${booking.professional.user.firstName} ${booking.professional.user.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="ml-4">
                <p className="text-lg font-semibold text-gray-900">
                  {booking.professional.user.firstName} {booking.professional.user.lastName}
                </p>
                <p className="text-sm text-primary font-medium">{booking.professional.title}</p>
                <p className="text-sm text-gray-600">{booking.service.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="text-primary mr-2 w-5 h-5" />
                  <span className="font-medium text-gray-900">Date & Time</span>
                </div>
                <p className="text-gray-600">{date}</p>
                <p className="text-gray-600">{time}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Video className="text-primary mr-2 w-5 h-5" />
                  <span className="font-medium text-gray-900">Session Type</span>
                </div>
                <p className="text-gray-600">Video Call ({booking.duration || 60} minutes)</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <CreditCard className="text-primary mr-2 w-5 h-5" />
                  <span className="font-medium text-gray-900">Payment</span>
                </div>
                <p className="text-gray-600">${booking.amount} - Paid</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Receipt className="text-primary mr-2 w-5 h-5" />
                  <span className="font-medium text-gray-900">Booking ID</span>
                </div>
                <p className="text-gray-600 font-mono">{booking.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Add to Calendar</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const start = new Date(booking.scheduledAt);
                    const end = new Date(start.getTime() + (booking.duration || 60) * 60000);
                    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Session with ${booking.professional.user.firstName} ${booking.professional.user.lastName}`)}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(booking.service.name)}`;
                    window.open(googleUrl, '_blank');
                  }}
                >
                  Google Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const start = new Date(booking.scheduledAt);
                    const end = new Date(start.getTime() + (booking.duration || 60) * 60000);
                    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Session with ${booking.professional.user.firstName} ${booking.professional.user.lastName}`)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(booking.service.name)}`;
                    window.open(outlookUrl, '_blank');
                  }}
                >
                  Outlook
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <CheckCircle className="text-blue-600 mr-2 mt-0.5 w-4 h-4" />
              You'll receive a confirmation email with session details and video call link
            </li>
            <li className="flex items-start">
              <CheckCircle className="text-blue-600 mr-2 mt-0.5 w-4 h-4" />
              {booking.professional.user.firstName} will send you a preparation guide 24 hours before your session
            </li>
            <li className="flex items-start">
              <CheckCircle className="text-blue-600 mr-2 mt-0.5 w-4 h-4" />
              Join the video call 5 minutes early for the best experience
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/" className="flex-1">
            <Button className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/bookings" className="flex-1">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              View All Bookings
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Need to make changes?{' '}
            <a href="#" className="text-primary hover:underline font-medium">Contact Support</a> or{' '}
            <a href="#" className="text-primary hover:underline font-medium">View Cancellation Policy</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}

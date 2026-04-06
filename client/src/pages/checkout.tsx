import { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import ClientHeader from "@/components/client-header";
import Layout from "@/components/Layout";

// Load Stripe
// if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
//  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
// }
const stripePromise = loadStripe("pk_test_51S5djjEKPjdG8injXAEaJ22nHOf9MsoMq5xYEYCYgHiutHtcxYQjTaN1iMxEAsDrm5dqgQ0hs1AahKeBRPsLGTb3004bJ2iqGI");

const CheckoutForm = ({ booking }: { booking: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmation/${booking.id}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment succeeded without redirect
      try {
        console.log("Payment succeeded, confirming booking...", booking.id);
        await apiRequest("POST", "/api/confirm-payment", { bookingId: booking.id });
        
        // Invalidate queries to update dashboards
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
        
        toast({
          title: "Payment Successful",
          description: "Your booking request has been submitted for professional review!",
        });
        console.log("Redirecting to confirmation page...");
        setTimeout(() => {
          setLocation(`/booking-confirmation/${booking.id}`);
        }, 1000);
      } catch (confirmError) {
        console.error("Error confirming payment:", confirmError);
        // Still redirect to confirmation page even if confirmation fails
        setTimeout(() => {
          setLocation(`/booking-confirmation/${booking.id}`);
        }, 1000);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay $${booking.amount}`}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const { bookingId } = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");

  const { data: booking, isLoading: bookingLoading } = useQuery<any>({
    queryKey: [`/api/booking/${bookingId}`],
    enabled: !!isAuthenticated && !!bookingId,
    queryFn: async () => {
      console.log('Fetching booking:', bookingId);
      const res = await apiRequest("GET", `/api/booking/${bookingId}`);
      const data = await res.json();
      console.log('Booking data received:', data);
      return data;
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async ({ amount, bookingId }: { amount: string; bookingId: string }) => {
      const response = await apiRequest("POST", "/api/create-payment-intent", { 
        amount: parseFloat(amount), 
        bookingId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    console.log('Checkout page auth state:', {
      isLoading,
      isAuthenticated,
      bookingId
    });
    
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
    if (booking && !clientSecret) {
      createPaymentIntentMutation.mutate({
        amount: booking.amount,
        bookingId: booking.id,
      });
    }
  }, [booking, clientSecret]);

  if (isLoading || bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking could not be loaded or you don't have permission to view it.</p>
          <Button onClick={() => window.location.href = '/'}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Preparing your payment...</p>
        </div>
      </div>
    );
  }

return (
  <Layout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={booking.professional?.id ? `/professional/${booking.professional.id}` : '/professionals'}>
            <Button variant="ghost" className="flex items-center gap-2" data-testid={`button-back-professional-${booking.professional?.id || 'fallback'}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to {booking.professional?.user?.firstName} {booking.professional?.user?.lastName}
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Booking</h1>
          <p className="text-gray-600">Secure payment powered by Stripe</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Summary */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>
              
              <div className="flex items-center mb-4">
                <img
                  src={
                    booking.professional.user.profileImageUrl ||
                    `https://ui-avatars.com/api/?name=${booking.professional.user.firstName}+${booking.professional.user.lastName}&background=2563eb&color=fff`
                  }
                  alt={`${booking.professional.user.firstName} ${booking.professional.user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">
                    {booking.professional.user.firstName} {booking.professional.user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{booking.service.name}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(booking.scheduledAt).toLocaleDateString()} at{' '}
                    {new Date(booking.scheduledAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">
                    {booking.sessionDuration || 1} {booking.sessionDuration === 1 ? 'hour' : 'hours'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session Type:</span>
                  <span className="font-medium text-gray-900">Video Call</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-bold text-gray-900">${booking.amount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm booking={booking} />
              </Elements>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Your payment information is encrypted and secure. You will receive a confirmation email after payment.
          </p>
        </div>
      </div>
  </Layout>
  );
}

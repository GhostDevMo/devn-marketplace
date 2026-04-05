import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Calendar, Star, PieChart, LogOut } from "lucide-react";
import { Link } from "wouter";
import ServiceCard from "@/components/service-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientHeader from "@/components/client-header";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: !!isAuthenticated,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
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
      }, 500);
      return;
    }

    // Redirect professionals to their dashboard
    if (user && user.role === "professional") {
      window.location.href = "/professional-dashboard";
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const upcomingBookings =
    bookings?.filter(
      (b) => new Date(b.scheduledAt) > new Date() && b.status === "confirmed",
    ) || [];

  const completedBookings =
    bookings?.filter((b) => b.status === "completed") || [];

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await apiRequest("POST", "/api/reviews", reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      setReviewModalOpen(false);
      setSelectedBooking(null);
      setRating(0);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Review",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedBooking || rating === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide a rating.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      bookingId: selectedBooking.id,
      professionalId: selectedBooking.professionalId,
      rating,
      comment: reviewText.trim() || null,
    });
  };

  const openReviewModal = (booking: any) => {
    setSelectedBooking(booking);
    setRating(0);
    setReviewText("");
    setReviewModalOpen(true);
  };

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user.firstName) return user.firstName[0];
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6 mobile-safe-bottom">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName || "there"}!
          </h2>
          <p className="text-gray-600">
            Ready to take control of your financial future?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Calendar className="text-green-600 w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Upcoming Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {upcomingBookings.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Star className="text-blue-600 w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Completed Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedBookings.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Choose a Service
          </h3>
          {servicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse"
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-gray-200 w-12 h-12 rounded-lg"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services?.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Bookings
              </h3>
              <Link href="/bookings">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {bookingsLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="ml-4">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-28 mt-1"></div>
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 2).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <img
                        src={
                          booking.professional.user.profileImageUrl ||
                          `https://ui-avatars.com/api/?name=${booking.professional.user.firstName}+${booking.professional.user.lastName}&background=2563eb&color=fff`
                        }
                        alt={`${booking.professional.user.firstName} ${booking.professional.user.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">
                          {booking.professional.user.firstName}{" "}
                          {booking.professional.user.lastName}
                        </p>
                        <p className="text-sm text-primary font-medium">
                          {booking.service.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.scheduledAt).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(booking.scheduledAt).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No upcoming bookings</p>
                <p className="text-sm text-gray-500 mt-1">
                  Book your first session to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Sessions */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Past Sessions
              </h3>
            </div>

            {bookingsLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="ml-4">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="w-24 h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : completedBookings.length > 0 ? (
              <div className="space-y-4">
                {completedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center flex-1">
                      <img
                        src={
                          booking.professional.user.profileImageUrl ||
                          `https://ui-avatars.com/api/?name=${booking.professional.user.firstName}+${booking.professional.user.lastName}&background=2563eb&color=fff`
                        }
                        alt={`${booking.professional.user.firstName} ${booking.professional.user.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="ml-4 flex-1">
                        <Link href={`/professional/${booking.professionalId}`}>
                          <p className="font-medium text-gray-900 hover:text-primary cursor-pointer">
                            {booking.professional.user.firstName}{" "}
                            {booking.professional.user.lastName}
                          </p>
                        </Link>
                        <p className="text-sm text-primary font-medium">
                          {booking.service.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.scheduledAt).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(booking.scheduledAt).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      {booking.reviewId ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Star className="w-3 h-3 mr-1" />
                          Review Submitted
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openReviewModal(booking)}
                          data-testid={`button-review-${booking.id}`}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Write Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No past sessions</p>
                <p className="text-sm text-gray-500 mt-1">
                  Completed sessions will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  src={
                    selectedBooking.professional.user.profileImageUrl ||
                    `https://ui-avatars.com/api/?name=${selectedBooking.professional.user.firstName}+${selectedBooking.professional.user.lastName}&background=2563eb&color=fff`
                  }
                  alt={`${selectedBooking.professional.user.firstName} ${selectedBooking.professional.user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {selectedBooking.professional.user.firstName}{" "}
                    {selectedBooking.professional.user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedBooking.service.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (Optional)
                </label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this professional..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={submitReviewMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={submitReviewMutation.isPending || rating === 0}
                >
                  {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

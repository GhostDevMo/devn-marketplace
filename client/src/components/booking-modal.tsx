import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import type { Professional, User, Service } from "@shared/schema";
import { useEffect} from "react";
import Layout from "@/components/Layout";

interface BookingModalProps {
  professional: Professional & { user: User };
  selectedSlot: string;
  service?: Service;
  onClose: () => void;
}

export default function BookingModal({ 
  professional, 
  selectedSlot, 
  service, 
  onClose 
}: BookingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [specialRequests, setSpecialRequests] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use service's basePrice - server will calculate the actual amount
  const displayPrice = service?.basePrice || "99";

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      console.log("Creating booking with data:", bookingData);
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      const result = await response.json();
      console.log("Booking created successfully:", result);
      return result;
    },
    onSuccess: (booking) => {
      console.log("Booking success callback:", booking);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Booking Created",
        description: "Redirecting to payment...",
      });
      onClose();
      setLocation(`/checkout/${booking.id}`);
    },
    onError: (error) => {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBooking = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms of service and cancellation policy.",
        variant: "destructive",
      });
      return;
    }

    if (!service) {
      toast({
        title: "Missing Information",
        description: "Service information is missing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Parse the selected slot to create a proper date
    // Slot format: YYYY-MM-DDTHH:MM (local time)
    const scheduledAt = new Date(selectedSlot.replace(" ", "T"));
    if (isNaN(scheduledAt.getTime())) {
      toast({
        title: "Invalid Time Slot",
        description: "Please select a valid time slot.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Check if the selected time has already passed for today
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (scheduledAt.toDateString() === now.toDateString() && scheduledAt.getTime() <= now.getTime()) {
      toast({
        title: "Time Has Passed",
        description: "The selected time has already passed. Please choose a different time slot.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Server will calculate amount based on service basePrice
    const bookingData = {
  professionalId: professional.id,
  serviceId: service.id,
  scheduledAt: scheduledAt.toISOString(),
  sessionDuration: 1,
  specialRequests: specialRequests.trim() || null,
};

    try {
      await createBookingMutation.mutateAsync(bookingData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSlotDisplay = (slot: string) => {
    try {
      console.log('formatSlotDisplay received slot:', slot);
      
      // Handle both local format (YYYY-MM-DDTHH:MM) and legacy UTC format (with Z)
      let date: Date;
      
      if (slot.endsWith('Z') || slot.includes('+') || slot.includes('T') && slot.split('T')[1].includes(':')) {
        // Legacy UTC format or full ISO format - parse and convert to local
        console.log('Parsing as UTC/ISO format');
        date = new Date(slot);
      } else {
        // Local datetime format YYYY-MM-DDTHH:MM - parse as local time
        console.log('Parsing as local format');
        date = new Date(slot);
      }
      
      console.log('Parsed date:', date);
      
      if (isNaN(date.getTime())) {
        return slot;
      }
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let dayDisplay;
      if (date.toDateString() === today.toDateString()) {
        dayDisplay = 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        dayDisplay = 'Tomorrow';
      } else {
        dayDisplay = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      
      const timeDisplay = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      return `${dayDisplay} at ${timeDisplay}`;
    } catch (error) {
      return slot;
    }
  };

  useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "auto";
  };
}, []);

  return (
  <Layout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
  <div className="min-h-full flex items-start justify-center p-4">
      <Card className="w-full max-w-md my-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Confirm Booking</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-4">
              <img
                src={
                  professional.user.profileImageUrl ||
                  `https://ui-avatars.com/api/?name=${professional.user.firstName}+${professional.user.lastName}&background=2563eb&color=fff`
                }
                alt={`${professional.user.firstName} ${professional.user.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="ml-3">
                <p className="font-semibold text-gray-900">
                  {professional.user.firstName} {professional.user.lastName}
                </p>
                <p className="text-sm text-gray-600">{service?.name || 'Financial Consultation'}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium text-gray-900">
                  {formatSlotDisplay(selectedSlot)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Session Type:</span>
                <span className="font-medium text-gray-900">Video Call</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-bold text-gray-900">${displayPrice}</span>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Special Requests (Optional)
            </label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full"
              rows={3}
              placeholder="Any specific topics you'd like to discuss or questions you have..."
            />
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-3">
              Payment Method
            </label>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center">
                <CreditCard className="text-primary mr-3 w-8 h-8" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-600">
                    Your payment information is encrypted and secure
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-6">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:underline">
                  Cancellation Policy
                </a>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleBooking}
              disabled={!agreedToTerms || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Continue to Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  </Layout>
  );
}

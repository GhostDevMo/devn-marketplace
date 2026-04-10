import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, IdCard, Users, DollarSign } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import TimeSlotPicker from "@/components/time-slot-picker";
import BookingModal from "@/components/booking-modal";
import ClientHeader from "@/components/client-header";
import type { Professional, User, Service, Review } from "@shared/schema";
import Layout from "@/components/Layout";

export default function ProfessionalProfile() {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [ownProfessionalId, setOwnProfessionalId] = useState<number | null>(null);

  // Fetch professionalId for logged-in professional if not present in URL
  useEffect(() => {
    if (!id && user?.role === "professional") {
      fetch("/api/professionals")
        .then(res => res.json())
        .then((pros: (Professional & { user: User })[]) => {
          if (Array.isArray(pros)) {
            const found = pros.find(p => p.user && p.user.id === user.id);
            if (found) setOwnProfessionalId(found.id);
          }
        })
        .catch(err => {
          console.error("Error fetching professionals:", err);
        });
    }
  }, [id, user]);

  // Determine which id to use: from URL or from logged-in user
  const professionalId = id ? parseInt(id) : ownProfessionalId;

  // Fetch professional profile
  const { data: professional, isLoading: professionalLoading, error, refetch } = useQuery<
    (Professional & {
      user: User;
      services: Array<{ service: Service; price: string }>;
      certifications: Array<{ name: string; issuingOrganization: string | null }>;
      reviews: Array<Review & { client: { firstName: string | null; lastName: string | null } }>;
    })
  >({
    queryKey: id ? ["/api/professional", professionalId] : ["/api/professional/profile"],
    enabled: !!isAuthenticated && (!!professionalId || !id),
    queryFn: async () => {
      const endpoint = id ? `/api/professional/${professionalId}` : '/api/professional/profile';
      const headers: any = { 'Content-Type': 'application/json' };

      // Add auth token for profile endpoint
      if (!id) {
        const token = localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error("Failed to fetch professional profile");
      return res.json();
    },
  });

  useEffect(() => {
    if (professional && user?.role === "professional" && !id) {
      setEditForm({
        title: professional.title || "",
        bio: professional.bio || "",
        experience: professional.experience || 0,
        profileImageUrl: professional.user?.profileImageUrl || "",
      });
    }
  }, [professional, user, id]);

  // Redirect to login if not authenticated, or to registration if professional profile not found
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
    if (error && user?.role === "professional" && !id && !professionalLoading) {
      // If this is the user's own profile and they get an error, redirect to registration
      toast({
        title: "Complete Your Professional Profile",
        description: "Please complete your professional registration to continue.",
        variant: "default",
      });
      setTimeout(() => {
        window.location.href = "/auth?role=professional";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, error, user, id, professionalLoading, toast]);

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect via useEffect
  }

  // If there's an error and no professional, show loading while redirect happens
  if (error && !professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLoading || professionalLoading || (!professional && !error)) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="ml-auto">
                    <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Add safety checks for professional data - only if professional exists
  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const safeServices = professional.services || [];
  const safeCertifications = professional.certifications || [];
  const safeProfileImage = professional.user?.profileImageUrl || "https://ui-avatars.com/api/?name=User&background=2563eb&color=fff";
  const safeFirstName = professional.user?.firstName || user?.firstName || 'User';
  const safeLastName = professional.user?.lastName || user?.lastName || '';
  const safeBio = professional.bio || "No bio available";
  const safeExperience = professional.experience || 0;
  const averageRating = parseFloat(professional.averageRating || '0');
  const safeReviewCount = professional.reviews?.length || 0;

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to update professional profile
    setIsEditing(false);
    toast({ title: "Profile updated!", description: "Your changes have been saved." });
    refetch();
  };

  const handleBookSession = () => {
    if (!selectedSlot) {
      toast({
        title: "Select a time slot",
        description: "Please select an available time slot before booking.",
        variant: "destructive",
      });
      return;
    }
    setShowBookingModal(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i: number) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const primaryService = safeServices.length > 0 ? safeServices[0] : null;
  

  const isOwnProfile = user?.role === "professional" && !id;
  
  const handleBack = () => {
    if (isOwnProfile) {
      window.location.href = "/dashboard";
    } else {
      window.history.back();
    }
  };

return (
  <Layout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
      {/* Header with Back Button */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="sm" className="mr-4" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Professional Profile</h1>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Professional Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex items-start mb-4 md:mb-0">
                <img
                  src={
                    (isEditing ? editForm?.profileImageUrl : safeProfileImage)
                  }
                  alt={`${safeFirstName} ${safeLastName}`}
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div className="ml-4 min-w-0">
                  {isEditing ? (
                    <form onSubmit={handleEditSave} className="space-y-2">
                      <input
                        type="text"
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2 mb-2"
                        placeholder="Professional Title"
                        required
                      />
                      <textarea
                        name="bio"
                        value={editForm.bio}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2 mb-2"
                        placeholder="Bio"
                        required
                      />
                      <input
                        type="number"
                        name="experience"
                        value={editForm.experience}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2 mb-2"
                        placeholder="Years of Experience"
                        required
                      />
                      <input
                        type="text"
                        name="profileImageUrl"
                        value={editForm.profileImageUrl}
                        onChange={handleEditChange}
                        className="w-full border rounded px-3 py-2 mb-2"
                        placeholder="Profile Image URL"
                      />
                      <Button type="submit" className="w-full mt-2">
                        Save Changes
                      </Button>
                    </form>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900 break-words">
                        {safeFirstName} {safeLastName}
                      </h2>
                      <p className="text-lg text-primary font-medium break-words">{professional.title}</p>
                      <div className="flex items-center mt-2">
                        <div className="flex items-center mr-4">
                          <div className="flex">
                            {renderStars(averageRating)}
                          </div>
                          <span className="ml-2 text-sm text-gray-600 break-words">
                            {averageRating.toFixed(1)} ({safeReviewCount} reviews)
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {safeExperience} years experience
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credentials & Specialties */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credentials & Specialties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Certifications</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {safeCertifications.map((cert: { name: string; issuingOrganization: string | null }, index: number) => (
                    <li key={index} className="flex items-center">
                      <IdCard className="text-primary mr-2 w-4 h-4" />
                      {cert.name}
                      {cert.issuingOrganization && (
                        <span className="text-gray-500 ml-1">({cert.issuingOrganization})</span>
                      )}
                    </li>
                  ))}
                  {safeCertifications.length === 0 && (
                    <li className="text-gray-500 italic">No certifications listed</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {safeServices.map((service: { service: Service; price: string }, index: number) => (
                    <Badge key={index} variant="secondary">
                      {service.service.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              About {safeFirstName}
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              {safeBio || 
                `With over ${safeExperience} years of experience in financial planning, ${safeFirstName} specializes in helping individuals and families achieve their financial goals. Their approach focuses on practical, actionable strategies that fit your lifestyle and priorities.`
              }
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary flex items-center justify-center">
                  <Users className="w-6 h-6 mr-1" />
                  {professional.totalClients || 0}+
                </div>
                <div className="text-sm text-gray-600">Clients Helped</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {professional.totalSessions || 0}
                </div>
                <div className="text-sm text-gray-600">Sessions Completed</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {averageRating > 0 ? `${(averageRating * 20).toFixed(0)}%` : 'New'}
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Reviews</h3>
            {(professional.reviews || []).length > 0 ? (
              <div className="space-y-4">
                {(professional.reviews || []).slice(0, 3).map((review: Review & { client: { firstName: string | null; lastName: string | null } }, index: number) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center mb-2">
                      <div className="flex">
                        {renderStars(review.rating)}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {review.client.firstName} {review.client.lastName}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800">{review.comment}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No reviews yet</p>
            )}
          </CardContent>
        </Card>

        {/* Available Times */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Times This Week</h3>
            <TimeSlotPicker
              professionalId={professional.id}
              onSlotSelect={setSelectedSlot}
              selectedSlot={selectedSlot}
            />

            <div className="mt-6 text-center">
              <Button
                onClick={handleBookSession}
                disabled={!selectedSlot}
                size="lg"
              >
                {selectedSlot ? 'Book This Time Slot' : 'Select a Time to Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <BookingModal
          professional={professional}
          selectedSlot={selectedSlot}
          service={primaryService?.service}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  </Layout>
  );
}
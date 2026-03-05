import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, Clock, Video } from "lucide-react";
import { Link } from "wouter";
import type { Professional, User, Service } from "@shared/schema";

interface ProfessionalCardProps {
  professional: Professional & {
    user: User;
    services: Array<{ service: Service; price: string }>;
    certifications: Array<{ name: string; issuingOrganization: string | null }>;
    averageRating: number;
    reviewCount: number;
  };
}

export default function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const primaryService = professional.services[0];
  const averageRating = professional.averageRating || 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getAvailabilityBadge = () => {
    return <Badge className="bg-green-100 text-green-800">Available Today</Badge>;
  };

  return (
    <Link href={`/professional/${professional.id}`}>
      <Card className="professional-card group">
        <CardContent className="p-6">
          <div className="flex items-start">
            <img
              src={
                professional.user.profileImageUrl ||
                `https://ui-avatars.com/api/?name=${professional.user.firstName}+${professional.user.lastName}&background=2563eb&color=fff`
              }
              alt={`${professional.user.firstName} ${professional.user.lastName}`}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {professional.user.firstName} {professional.user.lastName}
                </h3>
                <div className="flex items-center">
                  <div className="flex mr-1">
                    {renderStars(averageRating)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {averageRating.toFixed(1)} ({professional.reviewCount})
                  </span>
                </div>
              </div>
              <p className="text-sm text-primary font-medium mb-2">{professional.title}</p>
              <p className="text-sm text-gray-600 mb-3">
                {professional.services.map(s => s.service.name).join(', ')}
              </p>
              <div className="flex items-center">
                {getAvailabilityBadge()}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {professional.totalClients || 0}+ clients
              </span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Next: {professional.isAvailableToday ? 'Today' : 'Tomorrow'}
              </span>
              <span className="flex items-center">
                <Video className="w-4 h-4 mr-1" />
                Video call
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

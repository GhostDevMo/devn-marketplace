import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import ProfessionalCard from "@/components/professional-card";
import ClientHeader from "@/components/client-header";
import type { Professional, User, Service } from "@shared/schema";
import Layout from "@/components/Layout";

export default function Professionals() {
  const { serviceSlug } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data: professionals, isLoading: professionalsLoading, error } = useQuery({
    queryKey: ["/api/professionals/service", serviceSlug],
    queryFn: () => fetch(`/api/professionals/service/${serviceSlug}`).then(res => res.json()),
    enabled: !!isAuthenticated && !!serviceSlug,
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
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect via useEffect
  }

  if (professionalsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-4"></div>
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-start">
                  <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-5 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-3 w-full"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                      <div className="h-5 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getServiceTitle = (slug: string) => {
    const titles: Record<string, string> = {
      'budgeting': 'Budgeting & Planning',
      'investment': 'Investment Advisory',
      'tax': 'Tax Consulting',
      'retirement': 'Retirement Planning',
      'debt': 'Debt Management',
      'insurance': 'Insurance Advisory'
    };
    return titles[slug] || 'Financial';
  };

  const filteredProfessionals = professionals?.filter(prof => {
    switch (filter) {
      case 'highest-rated':
        return prof.averageRating >= 4.5;
      case 'lowest-price':
        return true; // Would need to sort by price
      case 'available-today':
        return prof.isAvailableToday;
      default:
        return true;
    }
  }) || [];

return (
<Layout>
  {/* Header FULL WIDTH */}
  <div className="bg-white shadow-sm border-b border-gray-100 overflow-x-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center py-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-4 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {getServiceTitle(serviceSlug || '')} Professionals
          </h1>
          <p className="text-sm text-gray-600">
            {professionals?.length || 0} professionals available
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* MAIN CONTENT */}
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="mb-6">
           <div className="flex flex-wrap gap-2 py-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Professionals
            </Button>
            <Button
              variant={filter === 'highest-rated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('highest-rated')}
            >
              Highest Rated
            </Button>
            <Button
              variant={filter === 'lowest-price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('lowest-price')}
            >
              Lowest Price
            </Button>
            <Button
              variant={filter === 'available-today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('available-today')}
            >
              Available Today
            </Button>
          </div>
        </div>

        {/* Professional Cards */}
        {filteredProfessionals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfessionals.map((prof) => (
              <ProfessionalCard
                key={prof.id}
                professional={{
                  ...prof,
                  bio: prof.bio ?? "",
                  experience: prof.experience ?? 0,
                  createdAt: typeof prof.createdAt === 'string' ? new Date(prof.createdAt) : null,
                  updatedAt: typeof prof.updatedAt === 'string' ? new Date(prof.updatedAt) : null,
                  nextAvailableSlot: typeof prof.nextAvailableSlot === 'string' ? new Date(prof.nextAvailableSlot) : null
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👨‍💼</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No professionals found</h3>
            <p className="text-gray-600">Try adjusting your filters or check back later.</p>
          </div>
        )}

        {/* Load More */}
        {filteredProfessionals.length > 0 && filteredProfessionals.length >= 10 && (
          <div className="text-center mt-8">
            <Button variant="outline">
              Load More Professionals
            </Button>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText, BookOpen, TrendingUp, CreditCard, Compass } from "lucide-react";
import { Link } from "wouter";
import type { Service } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
}

const getServiceIcon = (slug: string) => {
  switch (slug) {
    case 'tax':
      return FileText;
    case 'bookkeeping':
      return BookOpen;
    case 'budgeting':
      return TrendingUp;
    case 'debt':
      return CreditCard;
    case 'general':
      return Compass;
    default:
      return Compass;
  }
};

const getServiceColor = (slug: string) => {
  return 'text-green-600 bg-green-100 group-hover:bg-green-200';
};

export default function ServiceCard({ service }: ServiceCardProps) {
  const IconComponent = getServiceIcon(service.slug);
  const colorClasses = getServiceColor(service.slug);

  return (
    <Link href={`/professionals/${service.slug}`} className="block h-full">
      <Card className="service-card group h-full flex flex-col">
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-center mb-4">
            <div className={`p-3 rounded-lg transition-colors ${colorClasses}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{service.name}</h4>
              <p className="text-sm text-gray-600">
                Starting at ${service.basePrice || '75'}/session
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3 flex-1">
            {service.description || 
              'Get expert guidance and personalized strategies to achieve your financial goals.'}
          </p>
          <div className="flex items-center text-primary text-sm font-medium mt-auto">
            <span>Find Professionals</span>
            <ArrowRight className="ml-2 w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import { db } from "../server/db";
import { users, services, professionals, professionalServices, bookings, reviews, certifications } from "@shared/schema";

async function seed() {
  console.log("Starting database seed...");

  // Clear existing data in correct order to avoid foreign key constraint violations
  console.log("Clearing existing data...");
  await db.delete(reviews);
  await db.delete(bookings);
  await db.delete(professionalServices);
  await db.delete(certifications);
  await db.delete(professionals);
  await db.delete(services);
  await db.delete(users);
  console.log("Database cleared.");

  // Insert sample services
  const serviceData = [
    {
      name: "Budgeting & Planning",
      slug: "budgeting",
      description: "Personal budget creation and financial planning guidance",
      icon: "calculator",
      basePrice: "75.00"
    },
    {
      name: "Investment Advisory",
      slug: "investment",
      description: "Portfolio management and investment strategy consultation",
      icon: "trending-up",
      basePrice: "125.00"
    },
    {
      name: "Tax Consulting",
      slug: "tax",
      description: "Tax preparation, planning, and optimization strategies",
      icon: "file-text",
      basePrice: "100.00"
    },
    {
      name: "Retirement Planning",
      slug: "retirement",
      description: "Long-term retirement savings and withdrawal strategies",
      icon: "piggy-bank",
      basePrice: "150.00"
    },
    {
      name: "Debt Management",
      slug: "debt",
      description: "Debt consolidation and repayment strategy planning",
      icon: "credit-card",
      basePrice: "85.00"
    },
    {
      name: "Insurance Advisory",
      slug: "insurance",
      description: "Life, health, and property insurance planning",
      icon: "shield",
      basePrice: "90.00"
    }
  ];

  const insertedServices = await db.insert(services).values(serviceData).returning();
  console.log(`Inserted ${insertedServices.length} services`);

  // Insert sample professional users
  const professionalUsers = [
    {
      id: "43024099", // Your actual user ID
      email: "mjcherilus@gmail.com", // Your actual email
      firstName: "Professional", // You can change this
      lastName: "User", // You can change this
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "prof_1",
      email: "sarah.johnson@example.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "prof_2", 
      email: "michael.chen@example.com",
      firstName: "Michael",
      lastName: "Chen",
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "prof_3",
      email: "emily.rodriguez@example.com", 
      firstName: "Emily",
      lastName: "Rodriguez",
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "prof_4",
      email: "david.thompson@example.com",
      firstName: "David", 
      lastName: "Thompson",
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: "prof_5",
      email: "lisa.patel@example.com",
      firstName: "Lisa",
      lastName: "Patel", 
      role: "professional" as const,
      profileImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face"
    }
  ];

  await db.insert(users).values(professionalUsers);
  console.log(`Inserted ${professionalUsers.length} professional users`);

  // Insert professionals
  const professionalData = [
    {
      userId: "43024099", // Your actual user ID
      title: "Financial Advisor",
      bio: "Experienced financial advisor helping clients achieve their financial goals through personalized planning and investment strategies.",
      experience: 5,
      hourlyRate: "125.00",
      isVerified: true,
      averageRating: "4.8",
      totalClients: 50,
      totalSessions: 150,
      isAvailableToday: true
    },
    {
      userId: "prof_1",
      title: "Certified Financial Planner",
      bio: "With over 8 years of experience, I specialize in comprehensive financial planning for individuals and families. My approach focuses on creating sustainable budgets and long-term wealth building strategies.",
      experience: 8,
      hourlyRate: "125.00",
      isVerified: true,
      averageRating: "4.8",
      totalClients: 142,
      totalSessions: 380,
      isAvailableToday: true
    },
    {
      userId: "prof_2", 
      title: "Investment Advisor & Portfolio Manager",
      bio: "Former Wall Street analyst with 12 years of experience in portfolio management and investment strategy. I help clients navigate market volatility and build diversified investment portfolios.",
      experience: 12,
      hourlyRate: "175.00",
      isVerified: true,
      averageRating: "4.9",
      totalClients: 89,
      totalSessions: 245,
      isAvailableToday: false
    },
    {
      userId: "prof_3",
      title: "Tax Specialist & CPA", 
      bio: "Certified Public Accountant with expertise in tax planning and preparation. I help clients maximize deductions and develop tax-efficient strategies for businesses and individuals.",
      experience: 6,
      hourlyRate: "150.00",
      isVerified: true,
      averageRating: "4.7",
      totalClients: 67,
      totalSessions: 156,
      isAvailableToday: true
    },
    {
      userId: "prof_4",
      title: "Retirement Planning Specialist",
      bio: "Dedicated to helping clients achieve their retirement dreams through strategic planning and smart investment choices. Specializing in 401(k) optimization and pension planning.",
      experience: 10,
      hourlyRate: "165.00", 
      isVerified: true,
      averageRating: "4.6",
      totalClients: 78,
      totalSessions: 203,
      isAvailableToday: true
    },
    {
      userId: "prof_5",
      title: "Debt Management Counselor",
      bio: "Helping families break free from debt through personalized repayment strategies and financial education. Certified credit counselor with a passion for financial literacy.",
      experience: 5,
      hourlyRate: "95.00",
      isVerified: true, 
      averageRating: "4.5",
      totalClients: 134,
      totalSessions: 298,
      isAvailableToday: false
    }
  ];

  const insertedProfessionals = await db.insert(professionals).values(professionalData).returning();
  console.log(`Inserted ${insertedProfessionals.length} professionals`);

  // Map services to professionals
  const professionalServiceMappings = [
    // Your professional account - Multiple services
    { professionalId: insertedProfessionals[0].id, serviceId: insertedServices[0].id, price: "125.00", specialtyDescription: "Comprehensive budget analysis and financial goal setting" },
    { professionalId: insertedProfessionals[0].id, serviceId: insertedServices[1].id, price: "150.00", specialtyDescription: "Investment portfolio management and strategy" },

    // Sarah Johnson - Budgeting & Planning specialist
    { professionalId: insertedProfessionals[1].id, serviceId: insertedServices[0].id, price: "125.00", specialtyDescription: "Comprehensive budget analysis and financial goal setting" },
    { professionalId: insertedProfessionals[0].id, serviceId: insertedServices[3].id, price: "150.00", specialtyDescription: "401(k) optimization and retirement timeline planning" },

    // Michael Chen - Investment focused
    { professionalId: insertedProfessionals[1].id, serviceId: insertedServices[1].id, price: "175.00", specialtyDescription: "Portfolio construction and risk management strategies" },
    { professionalId: insertedProfessionals[1].id, serviceId: insertedServices[3].id, price: "200.00", specialtyDescription: "Advanced retirement portfolio optimization" },

    // Emily Rodriguez - Tax specialist
    { professionalId: insertedProfessionals[2].id, serviceId: insertedServices[2].id, price: "150.00", specialtyDescription: "Tax preparation and strategic planning" },
    { professionalId: insertedProfessionals[2].id, serviceId: insertedServices[0].id, price: "125.00", specialtyDescription: "Tax-efficient budgeting strategies" },

    // David Thompson - Retirement specialist  
    { professionalId: insertedProfessionals[3].id, serviceId: insertedServices[3].id, price: "165.00", specialtyDescription: "Comprehensive retirement planning and Social Security optimization" },
    { professionalId: insertedProfessionals[3].id, serviceId: insertedServices[5].id, price: "140.00", specialtyDescription: "Retirement insurance and long-term care planning" },

    // Lisa Patel - Debt management
    { professionalId: insertedProfessionals[4].id, serviceId: insertedServices[4].id, price: "95.00", specialtyDescription: "Debt consolidation and repayment strategy development" },
    { professionalId: insertedProfessionals[4].id, serviceId: insertedServices[0].id, price: "85.00", specialtyDescription: "Budget optimization for debt elimination" }
  ];

  await db.insert(professionalServices).values(professionalServiceMappings);
  console.log(`Inserted ${professionalServiceMappings.length} professional service mappings`);

  // Add certifications
  const certificationData = [
    { professionalId: insertedProfessionals[0].id, name: "Certified Financial Planner (CFP)", issuingOrganization: "CFP Board" },
    { professionalId: insertedProfessionals[0].id, name: "Personal Financial Specialist", issuingOrganization: "AICPA" },

    { professionalId: insertedProfessionals[1].id, name: "Chartered Financial Analyst (CFA)", issuingOrganization: "CFA Institute" },
    { professionalId: insertedProfessionals[1].id, name: "Financial Risk Manager (FRM)", issuingOrganization: "GARP" },

    { professionalId: insertedProfessionals[2].id, name: "Certified Public Accountant (CPA)", issuingOrganization: "AICPA" },
    { professionalId: insertedProfessionals[2].id, name: "Enrolled Agent (EA)", issuingOrganization: "IRS" },

    { professionalId: insertedProfessionals[3].id, name: "Retirement Income Certified Professional", issuingOrganization: "RICP" },
    { professionalId: insertedProfessionals[3].id, name: "Chartered Retirement Planning Counselor", issuingOrganization: "CRPC" },

    { professionalId: insertedProfessionals[4].id, name: "Certified Credit Counselor", issuingOrganization: "NFCC" },
    { professionalId: insertedProfessionals[4].id, name: "Financial Counselor Certification", issuingOrganization: "AFCPE" }
  ];

  await db.insert(certifications).values(certificationData);
  console.log(`Inserted ${certificationData.length} certifications`);

  console.log("Database seeding completed successfully!");
}

seed().catch(console.error);
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";

export default function Auth() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  // Set green background for scroll container on auth page
  useEffect(() => {
    const scrollContainer = document.querySelector('.app-scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.backgroundColor = 'hsl(120, 30%, 35%)';
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.style.backgroundColor = '';
      }
    };
  }, []);
  
  // Get default tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') || 'login';
  const roleParam = urlParams.get('role');
  
  // Check if we're completing a profile for an existing professional user
  const isCompletingProfile = isAuthenticated && user?.role === 'professional' && roleParam === 'professional';
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    role: (roleParam as "client" | "professional") || "client",
    specializations: "",
    experience: "",
    certifications: "",
    bio: "",
    selectedServices: [] as number[]
  });

  // Fetch available services for professional registration
  const { data: services } = useQuery({
    queryKey: ['/api/services'],
    queryFn: () => fetch('/api/services').then(res => res.json()),
    enabled: registerForm.role === 'professional'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        // Redirect based on role
        const redirectUrl = data.user?.role === 'professional' ? '/professional-dashboard' : '/';
        window.location.href = redirectUrl;
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If completing profile for existing user, skip password validation
    if (!isCompletingProfile && registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use different endpoint if completing profile for existing user
      const endpoint = isCompletingProfile ? '/api/auth/complete-profile' : '/api/auth/register';
      const token = localStorage.getItem('token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (isCompletingProfile && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const body = isCompletingProfile ? {
        title: 'Financial Advisor',
        bio: registerForm.bio || '',
        experience: registerForm.experience || '0',
        selectedServices: registerForm.selectedServices
      } : {
        email: registerForm.email,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        password: registerForm.password,
        role: registerForm.role,
        title: registerForm.role === 'professional' ? 'Financial Advisor' : undefined,
        bio: registerForm.bio || undefined,
        experience: registerForm.experience || undefined,
        selectedServices: registerForm.selectedServices || undefined
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isCompletingProfile) {
          localStorage.setItem('token', data.token);
        }
        // Redirect to professional dashboard
        window.location.href = '/professional-dashboard';
      } else {
        toast({
          title: isCompletingProfile ? "Profile completion failed" : "Registration failed",
          description: data.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-primary p-4 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="Devn Logo" className="w-32 h-32 mx-auto rounded-lg" />
          </div>
          <p className="text-white text-lg">Your Financial Advisory Marketplace</p>
        </div>

        <Card className="bg-white rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-gray-900">Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                {isCompletingProfile ? (
                  <>
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Complete your professional profile to start receiving bookings.
                      </p>
                    </div>
                  </>
                ) : null}
                
                <form onSubmit={handleRegister} className="space-y-4">
                  {!isCompletingProfile && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            placeholder="First name"
                            value={registerForm.firstName}
                            onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            placeholder="Last name"
                            value={registerForm.lastName}
                            onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Create a password"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>I am joining as:</Label>
                        <RadioGroup
                          value={registerForm.role}
                          onValueChange={(value) => {
                            setRegisterForm({...registerForm, role: value as "client" | "professional"});
                            // Add professional fields when professional is selected
                            if (value === "professional") {
                              setRegisterForm(prev => ({
                                ...prev,
                                role: "professional",
                                specializations: "",
                                experience: "",
                                certifications: "",
                                bio: ""
                              }));
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="client" id="client" />
                            <Label htmlFor="client">Client - Looking for financial advice</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="professional" id="professional" />
                            <Label htmlFor="professional">Professional - Providing financial services</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                  
                  {/* Professional additional fields */}
                  {(registerForm.role === "professional" || isCompletingProfile) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="specializations">Specializations</Label>
                        <Input
                          id="specializations"
                          placeholder="e.g., Investment Planning, Tax Strategy"
                          value={registerForm.specializations || ""}
                          onChange={(e) => setRegisterForm({...registerForm, specializations: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          placeholder="e.g., 5"
                          value={registerForm.experience || ""}
                          onChange={(e) => setRegisterForm({...registerForm, experience: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="certifications">Certifications</Label>
                        <Input
                          id="certifications"
                          placeholder="e.g., CFA, CFP, CPA"
                          value={registerForm.certifications || ""}
                          onChange={(e) => setRegisterForm({...registerForm, certifications: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell clients about your expertise and approach..."
                          value={registerForm.bio || ""}
                          onChange={(e) => setRegisterForm({...registerForm, bio: e.target.value})}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Services You Offer (Select at least one)</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {services?.map((service: any) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={registerForm.selectedServices.includes(service.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRegisterForm({
                                      ...registerForm,
                                      selectedServices: [...registerForm.selectedServices, service.id]
                                    });
                                  } else {
                                    setRegisterForm({
                                      ...registerForm,
                                      selectedServices: registerForm.selectedServices.filter(id => id !== service.id)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`service-${service.id}`} className="text-sm">
                                {service.name} - {service.description}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {registerForm.selectedServices.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Please select at least one service to offer to clients.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading 
                      ? (isCompletingProfile ? "Completing Profile..." : "Creating Account...")
                      : (isCompletingProfile ? "Complete Profile" : "Create Account")
                    }
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
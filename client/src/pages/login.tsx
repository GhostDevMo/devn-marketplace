import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  token: string;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "client" as "client" | "professional",
  });

  const [error, setError] = useState<string>("");

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return await response.json() as AuthResponse;
    },
    onSuccess: (data) => {
      // Store the token in localStorage for future requests
      localStorage.setItem('token', data.token);
      
      // Set up authorization header for future requests
      queryClient.setQueryData(["/api/auth/user"], data.user);
      
      toast({
        title: "Welcome back!",
        description: `Hello ${data.user.firstName}, you've successfully signed in.`,
      });
      
      navigate("/");
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return await response.json() as AuthResponse;
    },
    onSuccess: (data) => {
      // Store the token in localStorage for future requests
      localStorage.setItem('token', data.token);
      
      // Set up authorization header for future requests
      queryClient.setQueryData(["/api/auth/user"], data.user);
      
      toast({
        title: "Welcome to Devn!",
        description: `Hello ${data.user.firstName}, your account has been created successfully.`,
      });
      
      navigate("/");
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!loginData.email || !loginData.password) {
      setError("Please fill in all fields");
      return;
    }

    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!registerData.firstName || !registerData.lastName || !registerData.email || !registerData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    registerMutation.mutate({
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      email: registerData.email,
      password: registerData.password,
      role: registerData.role,
    });
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="Devn Logo" className="w-32 h-32 mx-auto rounded-lg" />
          </div>
          <p className="text-white text-lg">Your Financial Services Marketplace</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Users className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs text-blue-100 font-medium">Expert Pros</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Shield className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs text-blue-100 font-medium">Secure</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Star className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs text-blue-100 font-medium">Trusted</p>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Card */}
        <Card className="bg-white rounded-2xl shadow-2xl">
          <CardContent className="p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mb-4 border-destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="text-right">
                    <Link href="/forgot-password">
                      <span className="text-sm text-primary hover:underline cursor-pointer">
                        Forgot password?
                      </span>
                    </Link>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstName">First Name</Label>
                      <Input
                        id="register-firstName"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastName">Last Name</Label>
                      <Input
                        id="register-lastName"
                        value={registerData.lastName}
                        onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                    <Input
                      id="register-confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Account Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`p-3 rounded-lg border ${
                          registerData.role === "client"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        onClick={() => setRegisterData({ ...registerData, role: "client" })}
                      >
                        <div className="text-sm font-medium">Client</div>
                        <div className="text-xs text-gray-600">Looking for advice</div>
                      </button>
                      <button
                        type="button"
                        className={`p-3 rounded-lg border ${
                          registerData.role === "professional"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        onClick={() => setRegisterData({ ...registerData, role: "professional" })}
                      >
                        <div className="text-sm font-medium">Professional</div>
                        <div className="text-xs text-gray-600">Provide services</div>
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit2, Save, X, User, Star, Users, DollarSign, Calendar, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientHeader from "@/components/client-header";
import Layout from "@/components/Layout";

export default function MyProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    bio: "",
    experience: "",
    hourlyRate: "",
  });

  // Fetch professional profile for current user
  const { data: professional, isLoading, error } = useQuery({
    queryKey: ['/api/professional/profile'],
    enabled: !!isAuthenticated && user?.role === "professional",
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/professional/profile', { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Professional profile not found');
        }
        throw new Error('Failed to fetch professional profile');
      }
      return res.json();
    },

  });

  // Set edit form when professional data loads
  if (professional && !isEditing && editForm.title === "") {
    setEditForm({
      title: professional.title || "",
      bio: professional.bio || "",
      experience: professional.experience?.toString() || "",
      hourlyRate: professional.hourlyRate || "",
    });
  }

  // Update profile mutation  
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/professional/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updatedData),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your professional profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/professional/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    const updatedData = {
      ...editForm,
      experience: parseInt(editForm.experience) || 0,
    };
    updateProfileMutation.mutate(updatedData);
  };

  const handleCancel = () => {
    if (professional) {
      setEditForm({
        title: professional.title || "",
        bio: professional.bio || "",
        experience: professional.experience?.toString() || "",
        hourlyRate: professional.hourlyRate || "",
      });
    }
    setIsEditing(false);
  };

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/auth/account");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      // Clear token and redirect to login
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  // Redirect to complete profile if needed
  if (error && error.message.includes('not found')) {
    toast({
      title: "Complete Your Professional Profile",
      description: "Please complete your professional registration to continue.",
      variant: "default",
    });
    setTimeout(() => {
      window.location.href = "/auth?role=professional";
    }, 2000);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Redirecting to complete your profile...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Profile</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load professional profile.</p>
        </div>
      </div>
    );
  }

return (
  <Layout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/professional-dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user?.firstName || 'User'} {user?.lastName || ''}
                    </h1>
                    {isEditing ? (
                      <Input
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        placeholder="Professional Title"
                        className="mt-2 max-w-xs"
                      />
                    ) : (
                      <p className="text-lg text-primary font-medium">{professional.title}</p>
                    )}
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">
                          {professional.averageRating || "New"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{professional.totalClients || 0} clients</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {professional.isVerified && (
                      <Badge variant="default" className="mt-1">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Section */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                name="bio"
                value={editForm.bio}
                onChange={handleEditChange}
                placeholder="Tell clients about your expertise and approach..."
                rows={4}
                className="w-full"
              />
            ) : (
              <p className="text-gray-700">
                {professional.bio || "No bio provided yet."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.totalClients || 0}</div>
                <div className="text-sm text-gray-600">Total Clients</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.totalSessions || 0}</div>
                <div className="text-sm text-gray-600">Sessions Completed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{professional.experience || 0}</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {professional.averageRating ? professional.averageRating.toFixed(1) : "New"}
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="ml-4"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Your professional profile</li>
                        <li>All bookings and appointments</li>
                        <li>Reviews and ratings</li>
                        <li>All personal information</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Yes, delete my account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
    </Layout>
  );
}
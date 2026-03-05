import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "client" | "professional";
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  console.log("useAuth running");
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
  };
}

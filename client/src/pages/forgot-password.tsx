import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/DEVN. (1)_1760493848111.png";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Something went wrong");
      }
      return res.json();
    },
    onSuccess: () => setSent(true),
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoImage} alt="Devn Logo" className="w-24 h-24 mx-auto rounded-lg mb-4" />
        </div>

        <Card className="bg-white rounded-2xl shadow-2xl">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center py-4 space-y-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-gray-500 text-sm">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox (and spam folder).
                </p>
                <Link href="/auth">
                  <Button variant="outline" className="w-full mt-2">Back to Sign In</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Forgot password?</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    <Mail className="w-4 h-4 mr-2" />
                    {mutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <Link href="/auth">
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto">
                      <ArrowLeft className="w-3 h-3" /> Back to Sign In
                    </button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

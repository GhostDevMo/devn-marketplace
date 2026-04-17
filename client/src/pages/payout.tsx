import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, DollarSign, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PayoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/professional/earnings"],
  });

  const { data: payoutRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/professional/payout-requests"],
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (data: { amount: number; notes?: string }) => {
      return await apiRequest("/api/professional/payout-request", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional/payout-requests"] });
      toast({
        title: "Payout Request Submitted",
        description: "Your payout request has been sent successfully.",
      });
      setIsDialogOpen(false);
      setPayoutNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit payout request. Please try again.",
      });
    },
  });

  const handleRequestPayout = () => {
    if (!earningsData?.summary?.availableForPayout) return;
    
    requestPayoutMutation.mutate({
      amount: parseFloat(earningsData.summary.availableForPayout),
      notes: payoutNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      rejected: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="bg-white border-b pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/professional-dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Earnings & Payouts</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-safe-bottom">
        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${earningsData?.summary?.totalEarned || "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {earningsData?.summary?.totalSessions || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Completed Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Completed Sessions</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!earningsData?.summary?.availableForPayout || parseFloat(earningsData?.summary?.availableForPayout) === 0}
                      data-testid="button-request-payout"
                    >
                      Request Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Payout</DialogTitle>
                      <DialogDescription>
                        Request a payout of ${earningsData?.summary?.availableForPayout || "0.00"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea
                        placeholder="Optional notes (e.g., preferred payment method, instructions)"
                        value={payoutNotes}
                        onChange={(e) => setPayoutNotes(e.target.value)}
                        rows={4}
                        data-testid="input-payout-notes"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel-payout"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRequestPayout}
                        disabled={requestPayoutMutation.isPending}
                        data-testid="button-confirm-payout"
                      >
                        {requestPayoutMutation.isPending ? "Submitting..." : "Submit Request"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : earningsData?.earnings?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No completed sessions yet</p>
              ) : (
                <div className="space-y-4">
                  {earningsData?.earnings?.map((earning: any) => (
                    <div key={earning.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {earning.client.firstName} {earning.client.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{earning.service.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(earning.scheduledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="default">Completed</Badge>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-green-600">Your Earnings:</span>
                          <span className="text-green-600">${earning.professionalEarning.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Payout Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : payoutRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payout requests yet</p>
              ) : (
                <div className="space-y-4">
                  {payoutRequests.map((request: any) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-lg">${parseFloat(request.amount).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">
                            Requested {new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                          {request.notes && (
                            <p className="text-sm text-gray-600 mt-2">Note: {request.notes}</p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.processedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Processed {new Date(request.processedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

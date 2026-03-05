
import { AlertCircle, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Alert, AlertDescription } from "./ui/alert";

export function NetworkStatus() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) {
    return null;
  }

  return (
    <Alert className="mb-4 border-destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        No internet connection. Some features may not work properly.
      </AlertDescription>
    </Alert>
  );
}

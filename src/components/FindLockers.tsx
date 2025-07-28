import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Info } from "lucide-react";

interface FindLockersProps {
  onBack: () => void;
}

export function FindLockers({ onBack }: FindLockersProps) {
  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Find Lockers
          </h1>
          <p className="text-muted-foreground">
            Locate nearby FreshDrop locker stations
          </p>
        </div>

        <Card className="border-0 shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Info className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl text-amber-700">No Lockers Available</CardTitle>
            <CardDescription>
              There are no lockers near you at this moment
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Our locker network is expanding! In the meantime, enjoy our convenient 
                pickup and delivery service right to your door.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={onBack}
                className="w-full"
              >
                Place Pickup & Delivery Order
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('mailto:support@freshdrop.com', '_blank')}
                className="w-full"
              >
                Request Locker Location
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
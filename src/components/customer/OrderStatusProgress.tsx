import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { 
  Package, 
  Truck, 
  Loader2, 
  CheckCircle, 
  Clock,
  User,
  MapPin,
  Droplets,
  Wind,
  Shirt,
  Camera,
  Home,
  CarFront,
  Package2
} from "lucide-react";

interface OrderStatusProgressProps {
  status: string;
  operatorName?: string;
  currentStep?: number;
  stepPhotos?: Record<string, string>;
  showDetailedTimeline?: boolean;
}

export function OrderStatusProgress({ status, operatorName, currentStep, stepPhotos, showDetailedTimeline = false }: OrderStatusProgressProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const getDetailedStepInfo = (step: number) => {
    const stepData = [
      { 
        step: 1, 
        title: "Order Confirmed", 
        description: "Your order has been placed and confirmed",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        details: "We've received your order and it's being processed."
      },
      { 
        step: 2, 
        title: "Operator En Route", 
        description: "Your operator is on their way to pick up your clothes",
        icon: CarFront,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        details: "Your operator has started their journey to your location."
      },
      { 
        step: 3, 
        title: "Arriving Soon", 
        description: "Operator is arriving at your location",
        icon: MapPin,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        details: "Your operator is very close to your pickup location."
      },
      { 
        step: 4, 
        title: "Clothes Collected", 
        description: "Your clothes have been picked up",
        icon: Package2,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        details: "Your laundry has been collected and is now with your operator.",
        hasPhoto: true
      },
      { 
        step: 5, 
        title: "Heading to Facility", 
        description: "Operator is traveling to the washing facility",
        icon: Truck,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        details: "Your clothes are on their way to our professional laundry facility."
      },
      { 
        step: 6, 
        title: "Arrived at Facility", 
        description: "Your clothes have arrived at the washing facility",
        icon: Home,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        details: "Your laundry has arrived and is being prepared for washing."
      },
      { 
        step: 7, 
        title: "In the Washer", 
        description: "Your clothes are currently being washed",
        icon: Droplets,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
        details: "Your clothes are being thoroughly cleaned with premium detergents.",
        animate: true
      },
      { 
        step: 8, 
        title: "Wash Complete", 
        description: "Washing cycle finished, moving to dryer",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        details: "The washing cycle is complete and your clothes are spotless!"
      },
      { 
        step: 9, 
        title: "In the Dryer", 
        description: "Your clothes are being dried",
        icon: Wind,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        details: "Your clothes are being gently dried to perfection.",
        animate: true
      },
      { 
        step: 10, 
        title: "Being Folded", 
        description: "Your clothes are being carefully folded",
        icon: Shirt,
        color: "text-pink-600",
        bgColor: "bg-pink-50",
        details: "Each item is being meticulously folded and organized."
      },
      { 
        step: 11, 
        title: "Ready for Delivery", 
        description: "Your clean clothes are packaged and ready",
        icon: Package,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        details: "Your freshly cleaned and folded clothes are ready for delivery!"
      },
      { 
        step: 12, 
        title: "Out for Delivery", 
        description: "Operator is delivering your clothes",
        icon: Truck,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        details: "Your operator is on their way to deliver your clean clothes."
      },
      { 
        step: 13, 
        title: "Delivered!", 
        description: "Your clothes have been delivered",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        details: "Your order is complete! Your clothes have been delivered to your location.",
        hasPhoto: true
      }
    ];

    return stepData.find(s => s.step === step) || stepData[0];
  };

  const getCurrentProgress = () => {
    if (currentStep) {
      return Math.min((currentStep / 13) * 100, 100);
    }
    
    // Fall back to status-based progress - treat unclaimed as order placed
    switch (status) {
      case 'placed':
      case 'unclaimed':
        return 8;
      case 'claimed':
        return 15;
      case 'picked_up':
        return 38;
      case 'in_progress':
      case 'washed':
        return 70;
      case 'folded':
        return 85;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  const getDisplayStatus = () => {
    // Convert unclaimed to more customer-friendly status
    if (status === 'unclaimed') {
      return 'placed';
    }
    return status;
  };

  const currentStepInfo = currentStep ? getDetailedStepInfo(currentStep) : null;
  const progress = getCurrentProgress();

  return (
    <div className="space-y-6">
      {/* Operator Info */}
      {operatorName && (
        <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Operator</p>
            <p className="font-semibold">{operatorName}</p>
          </div>
        </div>
      )}

      {/* Current Step Highlight */}
      {currentStepInfo && (
        <div className={`${currentStepInfo.bgColor} border border-primary/20 rounded-xl p-6 space-y-4`}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
              <currentStepInfo.icon 
                className={`h-6 w-6 ${currentStepInfo.color} ${currentStepInfo.animate ? 'animate-pulse' : ''}`}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{currentStepInfo.title}</h3>
              <p className="text-muted-foreground">{currentStepInfo.description}</p>
              <p className="text-sm text-muted-foreground mt-2">{currentStepInfo.details}</p>
            </div>
          </div>

          {/* Step Photo */}
          {currentStepInfo.hasPhoto && stepPhotos && stepPhotos[`step_${currentStep}`] && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Photo Update</p>
              <div className="relative">
                <img 
                  src={stepPhotos[`step_${currentStep}`]} 
                  alt={`Step ${currentStep} photo`}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPhoto(stepPhotos[`step_${currentStep}`])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs md:text-sm"
                  onClick={() => setSelectedPhoto(stepPhotos[`step_${currentStep}`])}
                >
                  <Camera className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">View Full Size</span>
                  <span className="sm:hidden">View</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Order Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-3" />
        {!showDetailedTimeline && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Order Placed</span>
            <span>Delivered</span>
          </div>
        )}
      </div>

      {/* Simple Status Display for Orders List */}
      {!showDetailedTimeline && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {getDisplayStatus() === 'placed' && 'Order Placed'}
            {getDisplayStatus() === 'claimed' && 'Operator Assigned'}
            {getDisplayStatus() === 'picked_up' && 'Picked Up'}
            {getDisplayStatus() === 'in_progress' && 'Processing'}
            {getDisplayStatus() === 'washed' && 'Processing'}
            {getDisplayStatus() === 'folded' && 'Ready for Delivery'}
            {getDisplayStatus() === 'completed' && 'Delivered'}
          </Badge>
          {operatorName && (
            <span className="text-sm text-muted-foreground">
              Operator: <span className="font-medium text-foreground">{operatorName}</span>
            </span>
          )}
        </div>
      )}

      {/* Detailed Step Timeline - Only show when explicitly requested */}
      {showDetailedTimeline && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Timeline</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Array.from({ length: 13 }, (_, i) => i + 1).map((step) => {
              const stepInfo = getDetailedStepInfo(step);
              const isCompleted = currentStep ? step <= currentStep : false;
              const isCurrent = step === currentStep;
              const hasPhoto = stepInfo.hasPhoto && stepPhotos && stepPhotos[`step_${step}`];

              return (
                <div 
                  key={step}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-primary/5 border border-primary/20' 
                      : isCompleted 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-muted/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <stepInfo.icon className={`h-4 w-4 ${stepInfo.animate && isCurrent ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className={`text-sm font-medium ${
                        isCurrent ? 'text-foreground' : isCompleted ? 'text-green-700' : 'text-muted-foreground'
                      }`}>
                        {stepInfo.title}
                      </h5>
                      {hasPhoto && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 md:h-8 px-1 md:px-2 text-xs"
                          onClick={() => setSelectedPhoto(stepPhotos[`step_${step}`])}
                        >
                          <Camera className="h-3 w-3 mr-0 md:mr-1" />
                          <span className="hidden md:inline">Photo</span>
                        </Button>
                      )}
                    </div>
                    <p className={`text-xs ${
                      isCurrent ? 'text-muted-foreground' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      {stepInfo.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Step Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img 
              src={selectedPhoto} 
              alt="Step photo"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
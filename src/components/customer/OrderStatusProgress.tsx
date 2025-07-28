import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Truck, 
  Loader2, 
  CheckCircle, 
  Clock,
  User
} from "lucide-react";

interface OrderStatusProgressProps {
  status: string;
  operatorName?: string;
  currentStep?: number;
}

export function OrderStatusProgress({ status, operatorName, currentStep }: OrderStatusProgressProps) {
  const getStatusInfo = (orderStatus: string, step?: number) => {
    // Use step for more granular progress if available
    if (step && step > 1) {
      const progressPercent = Math.min((step / 13) * 100, 100);
      
      if (step <= 3) {
        return {
          progress: Math.max(progressPercent, 15),
          icon: Truck,
          label: 'Pickup in Progress',
          color: 'bg-orange-500',
          description: 'Operator heading to pickup location'
        };
      } else if (step <= 6) {
        return {
          progress: Math.max(progressPercent, 35),
          icon: Package,
          label: 'Collecting Laundry',
          color: 'bg-blue-500',
          description: 'Operator collecting your items'
        };
      } else if (step <= 9) {
        return {
          progress: Math.max(progressPercent, 55),
          icon: Loader2,
          label: 'Washing',
          color: 'bg-blue-500',
          description: 'Your items are being washed',
          animate: true
        };
      } else if (step <= 12) {
        return {
          progress: Math.max(progressPercent, 80),
          icon: Package,
          label: 'Preparing for Delivery',
          color: 'bg-purple-500',
          description: 'Items are ready, preparing delivery'
        };
      } else if (step === 13) {
        return {
          progress: 100,
          icon: CheckCircle,
          label: 'Delivered',
          color: 'bg-green-600',
          description: 'Order complete'
        };
      }
    }

    // Fall back to status-based progress
    switch (orderStatus) {
      case 'placed':
      case 'unclaimed':
        return {
          progress: 10,
          icon: Clock,
          label: 'Order Placed',
          color: 'bg-blue-500',
          description: 'Waiting for pickup'
        };
      case 'claimed':
        return {
          progress: 25,
          icon: Truck,
          label: 'Pickup Assigned',
          color: 'bg-orange-500',
          description: 'Operator assigned to your order'
        };
      case 'picked_up':
        return {
          progress: 40,
          icon: Truck,
          label: 'Picked Up',
          color: 'bg-blue-500',
          description: 'En route to washing facility'
        };
      case 'in_progress':
      case 'washed':
        return {
          progress: 70,
          icon: Loader2,
          label: 'Processing',
          color: 'bg-blue-500',
          description: 'Being washed and processed',
          animate: true
        };
      case 'folded':
        return {
          progress: 85,
          icon: Package,
          label: 'Ready for Delivery',
          color: 'bg-purple-500',
          description: 'Ready for delivery'
        };
      case 'completed':
        return {
          progress: 100,
          icon: CheckCircle,
          label: 'Delivered',
          color: 'bg-green-600',
          description: 'Order complete'
        };
      default:
        return {
          progress: 0,
          icon: Clock,
          label: 'Unknown',
          color: 'bg-gray-500',
          description: 'Status unknown'
        };
    }
  };

  const statusInfo = getStatusInfo(status, currentStep);
  const Icon = statusInfo.icon;

  return (
    <div className="space-y-4">
      {/* Operator Info */}
      {operatorName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Operator: <span className="font-medium text-foreground">{operatorName}</span></span>
        </div>
      )}

      {/* Status Badge and Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className="flex items-center gap-2 px-3 py-1"
          >
            <Icon 
              className={`h-4 w-4 ${statusInfo.animate ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {statusInfo.description}
          </span>
        </div>
        
        <div className="space-y-2">
          <Progress value={statusInfo.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Order Placed</span>
            <span>Delivered</span>
          </div>
        </div>
      </div>

      {/* Status Steps */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { key: 'placed', label: 'Placed' },
          { key: 'claimed', label: 'Picked Up' },
          { key: 'in_progress', label: 'Processing' },
          { key: 'completed', label: 'Delivered' }
        ].map((step, index) => {
          const isActive = statusInfo.progress > (index * 25);
          const isCurrent = 
            (step.key === 'placed' && ['placed', 'unclaimed'].includes(status)) ||
            (step.key === 'claimed' && status === 'claimed') ||
            (step.key === 'in_progress' && ['in_progress', 'washed', 'out_for_delivery'].includes(status)) ||
            (step.key === 'completed' && status === 'completed');
          
          return (
            <div 
              key={step.key}
              className={`text-center p-2 rounded ${
                isCurrent 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : isActive 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
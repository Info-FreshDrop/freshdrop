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
}

export function OrderStatusProgress({ status, operatorName }: OrderStatusProgressProps) {
  const getStatusInfo = (orderStatus: string) => {
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
          label: 'Picked Up',
          color: 'bg-orange-500',
          description: 'En route to facility'
        };
      case 'in_progress':
        return {
          progress: 50,
          icon: Loader2,
          label: 'Washing',
          color: 'bg-blue-500',
          description: 'Being processed',
          animate: true
        };
      case 'washed':
        return {
          progress: 75,
          icon: Package,
          label: 'Ready',
          color: 'bg-purple-500',
          description: 'Ready for delivery'
        };
      case 'out_for_delivery':
        return {
          progress: 90,
          icon: Truck,
          label: 'Out for Delivery',
          color: 'bg-green-500',
          description: 'On the way to you'
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

  const statusInfo = getStatusInfo(status);
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
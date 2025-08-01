import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
    loading?: boolean;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'p-6',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm'
  },
  md: {
    container: 'p-8',
    icon: 'h-12 w-12',
    title: 'text-xl',
    description: 'text-base'
  },
  lg: {
    container: 'p-12',
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-lg'
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  size = 'md'
}) => {
  const classes = sizeClasses[size];

  return (
    <Card className={cn('border-0 shadow-soft', className)}>
      <CardContent className={cn('text-center', classes.container)}>
        {icon && (
          <div className="flex justify-center mb-4">
            <div className={cn('text-muted-foreground', classes.icon)}>
              {icon}
            </div>
          </div>
        )}
        
        <h3 className={cn('font-semibold text-foreground mb-2', classes.title)}>
          {title}
        </h3>
        
        {description && (
          <p className={cn('text-muted-foreground mb-6', classes.description)}>
            {description}
          </p>
        )}
        
        {action && (
          <Button 
            onClick={action.onClick}
            variant={action.variant || 'default'}
            disabled={action.loading}
            className="gap-2"
          >
            {action.loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Predefined empty states for common scenarios
export const NoOrdersEmptyState = ({ onCreateOrder }: { onCreateOrder: () => void }) => (
  <EmptyState
    icon={<div className="text-4xl">📦</div>}
    title="No orders yet"
    description="You haven't placed any laundry orders. Ready to get started?"
    action={{
      label: "Place First Order",
      onClick: onCreateOrder
    }}
  />
);

export const NoDataEmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <EmptyState
    icon={<div className="text-4xl">📭</div>}
    title="No data available"
    description="There's nothing to show right now. Try refreshing or check back later."
    action={{
      label: "Refresh",
      onClick: onRefresh,
      variant: "outline"
    }}
    size="sm"
  />
);

export const ErrorEmptyState = ({ 
  onRetry, 
  isRetrying = false 
}: { 
  onRetry: () => void;
  isRetrying?: boolean;
}) => (
  <EmptyState
    icon={<div className="text-4xl">⚠️</div>}
    title="Something went wrong"
    description="We couldn't load the data. Please try again."
    action={{
      label: isRetrying ? "Retrying..." : "Try Again",
      onClick: onRetry,
      variant: "outline",
      loading: isRetrying
    }}
    size="sm"
  />
);
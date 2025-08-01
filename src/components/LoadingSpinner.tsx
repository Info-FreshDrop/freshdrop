import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export function LoadingSpinner({ size = 'md', className, text, fullScreen = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function FullScreenLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
      <LoadingSpinner size="xl" text={text} />
    </div>
  );
}

// Skeleton components for better loading states
export const OrderSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center space-x-4">
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-[250px]" />
        <div className="skeleton h-4 w-[200px]" />
      </div>
    </div>
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-3/4" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="skeleton h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton h-32 w-full rounded-lg" />
      ))}
    </div>
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <OrderSkeleton key={i} />
      ))}
    </div>
  </div>
);
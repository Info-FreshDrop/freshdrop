import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronDown, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }>;
  cancelLabel?: string;
}

export function IOSActionSheet({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  actions, 
  cancelLabel = "Cancel" 
}: IOSActionSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-xl border-0 bg-background/95 backdrop-blur-sm safe-area-bottom"
      >
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="ios-headline">{title}</SheetTitle>
          {description && (
            <SheetDescription className="ios-subhead text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        
        <div className="space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="mobile"
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={cn(
                "w-full justify-center ios-touch",
                action.destructive && "text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              )}
            >
              {action.label}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="mobile"
            onClick={onClose}
            className="w-full justify-center ios-touch mt-4 border-2"
          >
            {cancelLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface IOSAlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function IOSAlert({ 
  variant = 'info', 
  title, 
  children, 
  className,
  dismissible = false,
  onDismiss 
}: IOSAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900", 
    error: "bg-red-50 border-red-200 text-red-900",
    success: "bg-green-50 border-green-200 text-green-900"
  };

  const variantIcons = {
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <AlertTriangle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />
  };

  return (
    <Alert className={cn(
      "border rounded-xl",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {variantIcons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="ios-callout font-semibold mb-1">{title}</h4>
          )}
          <AlertDescription className="ios-subhead">
            {children}
          </AlertDescription>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 -mt-1 -mr-1 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

interface IOSPickerProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  onSelect: (value: string) => void;
  className?: string;
}

export function IOSPicker({ 
  label, 
  value, 
  placeholder = "Select...", 
  options, 
  onSelect, 
  className 
}: IOSPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full h-11 px-4 justify-between ios-touch bg-background border-border"
      >
        <div className="text-left">
          <div className="ios-caption text-muted-foreground">{label}</div>
          <div className="ios-body">
            {selectedOption?.label || placeholder}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Button>

      <IOSActionSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={label}
        actions={options.map(option => ({
          label: option.label,
          onClick: () => onSelect(option.value),
          disabled: option.disabled
        }))}
      />
    </div>
  );
}

interface IOSProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function IOSProgressIndicator({ currentStep, totalSteps, className }: IOSProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="ios-callout text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="ios-callout text-primary font-semibold">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-gradient-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useCapacitor } from '@/hooks/useCapacitor';
import { ImpactStyle } from '@capacitor/haptics';
import { cn } from '@/lib/utils';

interface HapticButtonProps extends ButtonProps {
  hapticStyle?: ImpactStyle;
  enableHaptic?: boolean;
}

export function HapticButton({ 
  children, 
  onClick, 
  hapticStyle = ImpactStyle.Light, 
  enableHaptic = true,
  className,
  ...props 
}: HapticButtonProps) {
  const { triggerHaptic, isNative } = useCapacitor();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback on native devices
    if (enableHaptic && isNative) {
      await triggerHaptic(hapticStyle);
    }
    
    // Call the original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "ios-touch transition-all duration-200",
        "active:scale-95 active:bg-opacity-80",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

// iOS-specific button variants
export function IOSPrimaryButton(props: HapticButtonProps) {
  return (
    <HapticButton
      {...props}
      className={cn("ios-button-primary", props.className)}
      hapticStyle={ImpactStyle.Medium}
    />
  );
}

export function IOSSecondaryButton(props: HapticButtonProps) {
  return (
    <HapticButton
      {...props}
      variant="outline"
      className={cn("ios-button-secondary", props.className)}
      hapticStyle={ImpactStyle.Light}
    />
  );
}

export function IOSDestructiveButton(props: HapticButtonProps) {
  return (
    <HapticButton
      {...props}
      variant="destructive"
      className={cn("ios-touch", props.className)}
      hapticStyle={ImpactStyle.Heavy}
    />
  );
}
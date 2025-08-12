import React from 'react';
import { cn } from '@/lib/utils';

interface IOSScreenProps {
  children: React.ReactNode;
  className?: string;
  hasTabBar?: boolean;
  hasHeader?: boolean;
}

export function IOSScreen({ children, className, hasTabBar = false, hasHeader = false }: IOSScreenProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col safe-area-full",
      className
    )}>
      {children}
    </div>
  );
}

interface IOSContentProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function IOSContent({ children, className, scrollable = true }: IOSContentProps) {
  return (
    <div className={cn(
      "flex-1 w-full max-w-md mx-auto",
      scrollable ? "overflow-y-auto" : "overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}

interface IOSScrollViewProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function IOSScrollView({ children, className, contentClassName }: IOSScrollViewProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      <div className={cn("px-4 py-4 space-y-6", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

interface IOSSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function IOSSection({ title, children, className, headerAction }: IOSSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="ios-title3 text-foreground">{title}</h3>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}

interface IOSListProps {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}

export function IOSList({ children, className, inset = false }: IOSListProps) {
  return (
    <div className={cn(
      "space-y-1",
      inset && "mx-4",
      className
    )}>
      {children}
    </div>
  );
}

interface IOSListItemProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  subtitle?: string;
}

export function IOSListItem({ 
  children, 
  className, 
  interactive = false, 
  onClick,
  leadingIcon,
  trailingIcon,
  subtitle
}: IOSListItemProps) {
  const Component = interactive ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "w-full bg-card border border-border rounded-xl p-4",
        "flex items-center justify-between min-h-[60px]",
        interactive && "ios-touch hover:bg-accent/50 active:bg-accent transition-colors",
        className
      )}
    >
      <div className="flex items-center space-x-3 flex-1">
        {leadingIcon && (
          <div className="flex-shrink-0">
            {leadingIcon}
          </div>
        )}
        <div className="flex-1 text-left">
          <div className="ios-body">{children}</div>
          {subtitle && (
            <div className="ios-footnote text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
      {trailingIcon && (
        <div className="flex-shrink-0 ml-3">
          {trailingIcon}
        </div>
      )}
    </Component>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSHeaderProps {
  title?: string;
  leftButton?: {
    icon?: React.ReactNode;
    text?: string;
    onClick: () => void;
  };
  rightButton?: {
    icon?: React.ReactNode;
    text?: string;
    onClick: () => void;
  };
  className?: string;
  transparent?: boolean;
}

export function IOSHeader({ 
  title, 
  leftButton, 
  rightButton, 
  className,
  transparent = false 
}: IOSHeaderProps) {
  return (
    <div className={cn(
      "ios-nav-header flex items-center justify-between px-4 safe-area-top",
      !transparent && "bg-background/95 backdrop-blur-sm",
      className
    )}>
      <div className="flex-1 flex justify-start">
        {leftButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={leftButton.onClick}
            className="ios-touch p-2 -ml-2"
          >
            {leftButton.icon || <ArrowLeft className="h-5 w-5" />}
            {leftButton.text && <span className="ml-1 ios-body">{leftButton.text}</span>}
          </Button>
        )}
      </div>
      
      <div className="flex-1 flex justify-center">
        {title && (
          <h1 className="ios-headline text-center truncate max-w-[200px]">
            {title}
          </h1>
        )}
      </div>
      
      <div className="flex-1 flex justify-end">
        {rightButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={rightButton.onClick}
            className="ios-touch p-2 -mr-2"
          >
            {rightButton.text && <span className="mr-1 ios-body">{rightButton.text}</span>}
            {rightButton.icon || <MoreHorizontal className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

interface IOSTabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    badge?: number;
  }>;
  activeTab: string;
  className?: string;
}

export function IOSTabBar({ tabs, activeTab, className }: IOSTabBarProps) {
  return (
    <div className={cn(
      "ios-tab-bar flex items-center justify-around safe-area-bottom bg-background/95 backdrop-blur-sm",
      className
    )}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          onClick={tab.onClick}
          className={cn(
            "ios-touch flex-1 flex flex-col items-center justify-center p-1 h-12 relative",
            activeTab === tab.id ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className="h-6 w-6 flex items-center justify-center mb-1">
            {tab.icon}
          </div>
          <span className="ios-caption font-medium">{tab.label}</span>
          {tab.badge && tab.badge > 0 && (
            <div className="absolute -top-1 right-2 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {tab.badge > 99 ? '99+' : tab.badge}
            </div>
          )}
        </Button>
      ))}
    </div>
  );
}

interface IOSCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export function IOSCard({ children, className, interactive = false, onClick }: IOSCardProps) {
  const Component = interactive ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "w-full bg-card rounded-xl p-4 border border-border shadow-sm",
        interactive && "ios-touch hover:bg-accent/50 active:bg-accent transition-colors",
        className
      )}
    >
      {children}
    </Component>
  );
}
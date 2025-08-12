import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface IOSFormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function IOSFormField({ label, children, error, className }: IOSFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="ios-callout text-muted-foreground">{label}</Label>
      {children}
      {error && (
        <p className="ios-footnote text-destructive">{error}</p>
      )}
    </div>
  );
}

interface IOSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function IOSInput({ label, error, className, ...props }: IOSInputProps) {
  const inputElement = (
    <Input
      className={cn(
        "h-11 px-4 ios-body border-border bg-background rounded-lg",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
        error && "border-destructive",
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <IOSFormField label={label} error={error}>
        {inputElement}
      </IOSFormField>
    );
  }

  return inputElement;
}

interface IOSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function IOSTextarea({ label, error, className, ...props }: IOSTextareaProps) {
  const textareaElement = (
    <Textarea
      className={cn(
        "min-h-[88px] px-4 py-3 ios-body border-border bg-background rounded-lg",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none",
        error && "border-destructive",
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <IOSFormField label={label} error={error}>
        {textareaElement}
      </IOSFormField>
    );
  }

  return textareaElement;
}

interface IOSSelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function IOSSelect({ 
  label, 
  placeholder, 
  value, 
  onValueChange, 
  children, 
  error, 
  className 
}: IOSSelectProps) {
  const selectElement = (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        className={cn(
          "h-11 px-4 ios-body border-border bg-background rounded-lg",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
          error && "border-destructive",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="ios-body">
        {children}
      </SelectContent>
    </Select>
  );

  if (label) {
    return (
      <IOSFormField label={label} error={error}>
        {selectElement}
      </IOSFormField>
    );
  }

  return selectElement;
}

interface IOSFormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function IOSFormSection({ title, children, className }: IOSFormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="ios-title3 text-foreground border-b border-border pb-2">
          {title}
        </h3>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
-- Add step-based columns to notification_templates
ALTER TABLE public.notification_templates 
ADD COLUMN trigger_step INTEGER,
ADD COLUMN step_description TEXT,
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Update existing templates to map to workflow steps
UPDATE public.notification_templates 
SET trigger_step = 3, step_description = 'Take pickup photo and confirm pickup'
WHERE status = 'claimed';

UPDATE public.notification_templates 
SET trigger_step = 7, step_description = 'Start washing cycle'
WHERE status = 'washing';

UPDATE public.notification_templates 
SET trigger_step = 9, step_description = 'Start drying cycle'
WHERE status = 'drying';

UPDATE public.notification_templates 
SET trigger_step = 11, step_description = 'Complete folding and organize clothes'
WHERE status = 'folded';

UPDATE public.notification_templates 
SET trigger_step = 12, step_description = 'Transport clothes for delivery'
WHERE status = 'out_for_delivery';

UPDATE public.notification_templates 
SET trigger_step = 13, step_description = 'Complete delivery handoff'
WHERE status = 'completed';

-- Soft delete the rinsing notification since it's not used in the 13-step workflow
UPDATE public.notification_templates 
SET is_deleted = true
WHERE status = 'rinsing';

-- Create index for better performance
CREATE INDEX idx_notification_templates_trigger_step ON public.notification_templates(trigger_step);
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active, is_deleted);
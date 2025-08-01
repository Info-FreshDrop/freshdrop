import { useEffect, useCallback } from 'react';
import { useCapacitor } from './useCapacitor';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useNotifications() {
  const { isNative, permissions, requestPermissions, sendLocalNotification, triggerHaptic } = useCapacitor();
  const { toast } = useToast();
  const { user } = useAuth();

  // Enhanced notification with error handling
  const showNotification = useCallback(async (title: string, body: string, withHaptic = true) => {
    try {
      if (isNative && permissions.notifications) {
        // Show native notification
        await sendLocalNotification(title, body);
        
        if (withHaptic) {
          // Import ImpactStyle and use the correct enum value
          const { ImpactStyle } = await import('@capacitor/haptics');
          await triggerHaptic(ImpactStyle.Medium);
        }
      } else {
        // Fallback to toast
        toast({
          title,
          description: body,
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Always fallback to toast
      toast({
        title,
        description: body,
      });
    }
  }, [isNative, permissions.notifications, sendLocalNotification, triggerHaptic, toast]);

  // Enhanced order notifications with more statuses
  const showOrderNotification = useCallback((status: string, orderNumber?: string) => {
    const statusMessages: Record<string, { title: string; body: string }> = {
      'placed': {
        title: 'Order Placed Successfully!',
        body: `Your order ${orderNumber ? `#${orderNumber}` : ''} has been placed and is waiting for pickup.`
      },
      'unclaimed': {
        title: 'Order Confirmed',
        body: `Your order ${orderNumber ? `#${orderNumber}` : ''} is confirmed and ready for an operator to claim.`
      },
      'claimed': {
        title: 'Order Claimed',
        body: `An operator has claimed your order ${orderNumber ? `#${orderNumber}` : ''} and will pick it up soon.`
      },
      'picked_up': {
        title: 'Order Picked Up',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} has been picked up and is being processed.`
      },
      'washing': {
        title: 'Order In Progress',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} is currently being washed.`
      },
      'drying': {
        title: 'Order In Progress',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} is currently being dried.`
      },
      'folding': {
        title: 'Order Almost Ready',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} is being folded and will be ready for delivery soon.`
      },
      'ready_for_delivery': {
        title: 'Order Ready for Delivery',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} is ready and will be delivered soon.`
      },
      'out_for_delivery': {
        title: 'Order Out for Delivery',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} is on its way to you!`
      },
      'delivered': {
        title: 'Order Delivered',
        body: `Your laundry ${orderNumber ? `#${orderNumber}` : ''} has been delivered successfully.`
      },
      'completed': {
        title: 'Order Completed',
        body: `Thank you! Your order ${orderNumber ? `#${orderNumber}` : ''} is complete. We hope you're satisfied with our service.`
      },
      'cancelled': {
        title: 'Order Cancelled',
        body: `Your order ${orderNumber ? `#${orderNumber}` : ''} has been cancelled. Any applicable refunds will be processed shortly.`
      },
      'failed': {
        title: 'Order Failed',
        body: `There was an issue with your order ${orderNumber ? `#${orderNumber}` : ''}. Please contact support for assistance.`
      }
    };

    const notification = statusMessages[status];
    if (notification) {
      showNotification(notification.title, notification.body);
    }
  }, [showNotification]);

  // Request notification permissions on mount
  useEffect(() => {
    if (isNative && !permissions.notifications) {
      requestPermissions();
    }
  }, [isNative, permissions.notifications, requestPermissions]);

  // Set up real-time order notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          const oldOrder = payload.old;
          const newOrder = payload.new;
          
          // Only notify on status changes
          if (oldOrder.status !== newOrder.status) {
            showOrderNotification(newOrder.status, newOrder.id.slice(-8));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showOrderNotification]);

  return {
    showNotification,
    showOrderNotification,
    isNative
  };
}
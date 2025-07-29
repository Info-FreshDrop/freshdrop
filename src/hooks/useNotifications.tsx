import { useEffect } from 'react';
import { useCapacitor } from './useCapacitor';
import { useToast } from './use-toast';

export function useNotifications() {
  const { isNative, sendLocalNotification, triggerHaptic } = useCapacitor();
  const { toast } = useToast();

  const showNotification = (title: string, body: string, withHaptic = true) => {
    if (isNative) {
      // Send native notification
      sendLocalNotification(title, body);
      if (withHaptic) {
        triggerHaptic();
      }
    } else {
      // Show toast notification for web
      toast({
        title,
        description: body,
      });
    }
  };

  const showOrderNotification = (status: string, orderNumber?: string) => {
    const statusMessages = {
      'unclaimed': {
        title: 'Order Confirmed',
        body: `Your order ${orderNumber ? '#' + orderNumber : ''} has been confirmed! Looking for an operator.`
      },
      'claimed': {
        title: 'Operator Assigned',
        body: `An operator has been assigned to your order ${orderNumber ? '#' + orderNumber : ''}!`
      },
      'picked_up': {
        title: 'Laundry Picked Up',
        body: `Your laundry ${orderNumber ? '#' + orderNumber : ''} has been picked up!`
      },
      'in_progress': {
        title: 'Laundry In Progress',
        body: `Your laundry ${orderNumber ? '#' + orderNumber : ''} is being cleaned!`
      },
      'completed': {
        title: 'Order Complete',
        body: `Your order ${orderNumber ? '#' + orderNumber : ''} is ready for delivery!`
      },
      'delivered': {
        title: 'Order Delivered',
        body: `Your order ${orderNumber ? '#' + orderNumber : ''} has been delivered!`
      },
      'cancelled': {
        title: 'Order Cancelled',
        body: `Your order ${orderNumber ? '#' + orderNumber : ''} has been cancelled.`
      }
    };

    const notification = statusMessages[status as keyof typeof statusMessages];
    if (notification) {
      showNotification(notification.title, notification.body);
    }
  };

  return {
    showNotification,
    showOrderNotification,
    isNative
  };
}
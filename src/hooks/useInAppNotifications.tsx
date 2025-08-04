import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order_update' | 'system' | 'promotion';
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export const useInAppNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const statusMessages = {
    'unclaimed': {
      title: 'Order Confirmed',
      message: 'We\'re finding an operator for your order!'
    },
    'claimed': {
      title: 'Operator Assigned',
      message: 'An operator has been assigned to your order'
    },
    'picked_up': {
      title: 'Laundry Picked Up',
      message: 'Your laundry is on its way to our facility'
    },
    'washing': {
      title: 'Washing in Progress',
      message: 'Your laundry is being washed with care'
    },
    'drying': {
      title: 'Drying in Progress',
      message: 'Your laundry is being dried'
    },
    'folded': {
      title: 'Folded & Ready',
      message: 'Your laundry has been cleaned and folded'
    },
    'completed': {
      title: 'Ready for Delivery',
      message: 'Your clean laundry is ready for delivery'
    },
    'delivered': {
      title: 'Order Delivered',
      message: 'Your laundry has been delivered!'
    },
    'cancelled': {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled'
    }
  };

  const createInAppNotification = (orderId: string, status: string): InAppNotification => {
    const statusInfo = statusMessages[status as keyof typeof statusMessages] || {
      title: 'Order Update',
      message: `Your order status has been updated to ${status}`
    };

    return {
      id: `${orderId}-${status}-${Date.now()}`,
      title: statusInfo.title,
      message: statusInfo.message,
      type: 'order_update',
      orderId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for order updates
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
          console.log('Order update received:', payload);
          
          if (payload.new && payload.old) {
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;
            
            // Only create notification if status actually changed
            if (newStatus !== oldStatus) {
              const notification = createInAppNotification(payload.new.id, newStatus);
              
              setNotifications(prev => [notification, ...prev]);
              
              // Show toast notification
              toast({
                title: notification.title,
                description: notification.message,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Update unread count whenever notifications change
  useEffect(() => {
    const unread = notifications.filter(notif => !notif.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };
};
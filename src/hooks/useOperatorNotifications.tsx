import { useEffect, useCallback, useState } from 'react';
import { useCapacitor } from './useCapacitor';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

interface OperatorNotificationData {
  orderId: string;
  customerName?: string;
  zipCode: string;
  serviceName: string;
  totalAmount: number;
  isExpress: boolean;
  pickupAddress?: string;
}

export function useOperatorNotifications() {
  const { isNative, permissions, requestPermissions, sendLocalNotification, triggerHaptic } = useCapacitor();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!isNative || !user) return;

    try {
      console.log('Starting push notification registration...');
      
      // Request permissions first
      await requestPermissions();
      
      if (!permissions.notifications) {
        console.warn('Push notification permissions not granted');
        toast({
          title: "Notifications Disabled",
          description: "Enable notifications in your device settings to receive order alerts.",
          variant: "destructive"
        });
        return;
      }

      console.log('Permissions granted, registering with FCM/APNs...');
      // Register with FCM/APNs
      await PushNotifications.register();

      // Get the token
      const result = await PushNotifications.getDeliveredNotifications();
      console.log('Delivered notifications:', result);

      setIsRegistered(true);

      // Listen for registration success
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        setPushToken(token.value);

        // Store the token in the database for this operator
        if (user?.id) {
          try {
            await supabase
              .from('washers')
              .update({ 
                push_notification_token: token.value,
                notifications_enabled: true,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
            
            console.log('Push token stored in database');
          } catch (error) {
            console.error('Error storing push token:', error);
          }
        }
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Listen for incoming notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        
        // Show local notification if app is in foreground
        if (notification.title && notification.body) {
          toast({
            title: notification.title,
            description: notification.body,
            duration: 5000,
          });
          
          // Trigger haptic feedback
          triggerHaptic();
        }
      });

      // Listen for notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action performed:', action);
        
        // Handle notification tap - could navigate to specific order
        if (action.notification.data?.orderId) {
          // You could implement navigation to the specific order here
          console.log('Navigate to order:', action.notification.data.orderId);
        }
      });

    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }, [isNative, user, permissions.notifications, requestPermissions, toast, triggerHaptic]);

  // Show notification for new order
  const showNewOrderNotification = useCallback(async (orderData: OperatorNotificationData) => {
    // Calculate operator earnings (40% of total amount based on business settings)
    const operatorEarnings = Math.round(orderData.totalAmount * 0.40);
    
    const title = '🧺 New Order Available!';
    const body = `Claim it now to make $${(operatorEarnings / 100).toFixed(2)}! ${orderData.serviceName} in ${orderData.zipCode}${orderData.isExpress ? ' (Express)' : ''}`;

    try {
      // Call backend notification service for SMS and email
      console.log('Calling notify-operators function with data:', {
        type: 'new_order',
        zipCodes: [orderData.zipCode],
        orderId: orderData.orderId,
        title: 'New Order Available!',
        message: 'A new order is available in your area!',
        orderData: {
          zipCode: orderData.zipCode,
          serviceName: orderData.serviceName,
          totalAmount: orderData.totalAmount,
          operatorEarnings: operatorEarnings,
          isExpress: orderData.isExpress,
          pickupAddress: orderData.pickupAddress
        }
      });

      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('notify-operators', {
        body: {
          type: 'new_order',
          zipCodes: [orderData.zipCode],
          orderId: orderData.orderId,
          title: 'New Order Available!',
          message: 'A new order is available in your area!',
          orderData: {
            zipCode: orderData.zipCode,
            serviceName: orderData.serviceName,
            totalAmount: orderData.totalAmount,
            operatorEarnings: operatorEarnings,
            isExpress: orderData.isExpress,
            pickupAddress: orderData.pickupAddress
          }
        }
      });

      if (notificationError) {
        console.error('Error calling notify-operators function:', notificationError);
      } else {
        console.log('Notification function called successfully:', notificationResult);
      }

      if (isNative && permissions.notifications) {
        // Show native notification
        await sendLocalNotification(title, body);
        
        // Trigger haptic feedback
        const { ImpactStyle } = await import('@capacitor/haptics');
        await triggerHaptic(ImpactStyle.Heavy);
      } else {
        // Fallback to toast
        toast({
          title,
          description: body,
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Error showing new order notification:', error);
      // Always fallback to toast
      toast({
        title,
        description: body,
        duration: 8000,
      });
    }
  }, [isNative, permissions.notifications, sendLocalNotification, triggerHaptic, toast]);

  // Set up real-time order notifications for operator's service areas
  useEffect(() => {
    if (!user) return;

    let washerData: any = null;

    // First get the operator's service areas
    const setupOrderNotifications = async () => {
      try {
        const { data: washer, error: washerError } = await supabase
          .from('washers')
          .select('id, zip_codes, is_active, is_online')
          .eq('user_id', user.id)
          .single();

        if (washerError || !washer) {
          console.error('Error loading washer data for notifications:', washerError);
          return;
        }

        washerData = washer;

        // Only listen for notifications if operator is active and online
        if (!washer.is_active || !washer.is_online) {
          console.log('Operator is not active or online, skipping notification setup');
          return;
        }

        console.log('Setting up order notifications for zip codes:', washer.zip_codes);

        // Set up real-time subscription for new orders in operator's zip codes
        const channel = supabase
          .channel('new-orders-for-operator')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders',
              filter: `zip_code=in.(${washer.zip_codes.join(',')})`
            },
            (payload) => {
              const newOrder = payload.new;
              console.log('New order detected:', newOrder);

              // Only notify for unclaimed orders (payment confirmed)
              if (newOrder.status === 'unclaimed') {
                showNewOrderNotification({
                  orderId: newOrder.id,
                  zipCode: newOrder.zip_code,
                  serviceName: newOrder.service_type || 'Laundry Service',
                  totalAmount: newOrder.total_amount_cents || 0,
                  isExpress: newOrder.is_express || false,
                  pickupAddress: newOrder.pickup_address
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `zip_code=in.(${washer.zip_codes.join(',')})`
            },
            (payload) => {
              const updatedOrder = payload.new;
              const oldOrder = payload.old;

              // Notify when order status changes to 'unclaimed' (order becomes available after payment)
              if (
                oldOrder.status !== 'unclaimed' && updatedOrder.status === 'unclaimed'
              ) {
                console.log('Order became available:', updatedOrder);
                showNewOrderNotification({
                  orderId: updatedOrder.id,
                  zipCode: updatedOrder.zip_code,
                  serviceName: updatedOrder.service_type || 'Laundry Service',
                  totalAmount: updatedOrder.total_amount_cents || 0,
                  isExpress: updatedOrder.is_express || false,
                  pickupAddress: updatedOrder.pickup_address
                });
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up order notifications:', error);
      }
    };

    setupOrderNotifications();
  }, [user, showNewOrderNotification]);

  // Register for push notifications when component mounts
  useEffect(() => {
    if (user && isNative) {
      registerForPushNotifications();
    }
  }, [user, isNative, registerForPushNotifications]);

  // Update operator online status
  const setOperatorOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('washers')
        .update({ 
          is_online: isOnline,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating online status:', error);
      } else {
        console.log('Operator online status updated:', isOnline);
      }
    } catch (error) {
      console.error('Error updating operator status:', error);
    }
  }, [user]);

  return {
    isRegistered,
    pushToken,
    showNewOrderNotification,
    setOperatorOnlineStatus,
    registerForPushNotifications
  };
}
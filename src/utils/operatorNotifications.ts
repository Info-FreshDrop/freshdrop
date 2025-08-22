import { supabase } from '@/integrations/supabase/client';

interface OrderNotificationData {
  orderId: string;
  zipCode: string;
  serviceName: string;
  totalAmount: number;
  isExpress: boolean;
  customerName?: string;
  pickupAddress?: string;
}

export async function notifyOperatorsOfNewOrder(orderData: OrderNotificationData) {
  try {
    const response = await supabase.functions.invoke('notify-operators', {
      body: {
        type: 'new_order',
        zipCodes: [orderData.zipCode],
        orderId: orderData.orderId,
        title: 'New Order Available!',
        message: `${orderData.serviceName} in ${orderData.zipCode} - $${(orderData.totalAmount / 100).toFixed(2)}${orderData.isExpress ? ' (Express)' : ''}`,
        orderData
      }
    });

    if (response.error) {
      console.error('Error notifying operators:', response.error);
      return { success: false, error: response.error };
    }

    console.log('Operators notified successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error in notifyOperatorsOfNewOrder:', error);
    return { success: false, error };
  }
}

export async function broadcastToAllOperators(message: string, title: string = 'FreshDrop Notification') {
  try {
    const response = await supabase.functions.invoke('notify-operators', {
      body: {
        type: 'broadcast',
        title,
        message
      }
    });

    if (response.error) {
      console.error('Error broadcasting to operators:', response.error);
      return { success: false, error: response.error };
    }

    console.log('Broadcast sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error in broadcastToAllOperators:', error);
    return { success: false, error };
  }
}
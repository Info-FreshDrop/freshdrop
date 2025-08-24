import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function TestOperatorNotifications() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testNotification = async () => {
    setTesting(true);
    setResults(null);

    try {
      console.log('Testing operator notification with new templates...');
      
      const testOrderData = {
        zipCode: '65807',
        serviceName: 'Wash & Fold',
        totalAmount: 2500,
        operatorEarnings: 1250,
        isExpress: false,
        customerName: 'Test Customer',
        pickupAddress: '123 Test St'
      };

      const response = await supabase.functions.invoke('notify-operators', {
        body: {
          type: 'new_order',
          zipCodes: ['65807'],
          orderId: 'test-' + Date.now(),
          title: 'Test New Order Available!',
          message: 'This is a test notification to verify the template system works',
          orderData: testOrderData
        }
      });

      console.log('Notification response:', response);

      if (response.error) {
        console.error('Notification error:', response.error);
        toast.error('Test failed: ' + JSON.stringify(response.error));
        setResults({ success: false, error: response.error });
      } else {
        console.log('Notification success:', response.data);
        toast.success('Test notification sent successfully!');
        setResults({ success: true, data: response.data });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed: ' + String(error));
      setResults({ success: false, error: String(error) });
    } finally {
      setTesting(false);
    }
  };

  const testBroadcast = async () => {
    setTesting(true);
    setResults(null);

    try {
      console.log('Testing broadcast notification...');
      
      const response = await supabase.functions.invoke('notify-operators', {
        body: {
          type: 'broadcast',
          title: 'Test Broadcast',
          message: 'This is a test broadcast message to all operators.'
        }
      });

      console.log('Broadcast response:', response);

      if (response.error) {
        console.error('Broadcast error:', response.error);
        toast.error('Broadcast test failed: ' + JSON.stringify(response.error));
        setResults({ success: false, error: response.error });
      } else {
        console.log('Broadcast success:', response.data);
        toast.success('Test broadcast sent successfully!');
        setResults({ success: true, data: response.data });
      }
    } catch (error) {
      console.error('Broadcast test error:', error);
      toast.error('Broadcast test failed: ' + String(error));
      setResults({ success: false, error: String(error) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test Operator Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={testNotification} 
            disabled={testing}
            className="w-full"
          >
            {testing ? 'Testing...' : 'Test New Order Notification'}
          </Button>
          
          <Button 
            onClick={testBroadcast} 
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? 'Testing...' : 'Test Broadcast Notification'}
          </Button>
        </div>

        {results && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>This test will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Call the notify-operators function with test data</li>
            <li>Use the new template system with variable replacement</li>
            <li>Send notifications to operators in zip code 65807</li>
            <li>Show the response and any errors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
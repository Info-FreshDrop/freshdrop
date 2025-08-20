import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Privacy Policy</CardTitle>
              <CardDescription>
                Last updated: {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                  <p className="text-muted-foreground mb-4">
                    We collect information you provide directly to us, such as when you create an account, 
                    place an order, or contact us for support.
                  </p>
                  
                  <h3 className="text-lg font-medium mb-2">Personal Information:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Name, email address, and phone number</li>
                    <li>Delivery addresses and billing information</li>
                    <li>Payment information (processed securely through Stripe)</li>
                    <li>Order history and preferences</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">Location Information:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>GPS location data when using our mobile app (with your permission)</li>
                    <li>Delivery addresses for order fulfillment</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">Device Information:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Camera access for order photos (with your permission)</li>
                    <li>Push notification preferences</li>
                    <li>Device identifiers and operating system information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Process and fulfill your laundry orders</li>
                    <li>Send order updates and delivery notifications</li>
                    <li>Provide customer support and respond to inquiries</li>
                    <li>Improve our services and user experience</li>
                    <li>Process payments securely through our payment processors</li>
                    <li>Send promotional communications (with your consent)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
                  <p className="text-muted-foreground mb-4">
                    We do not sell, trade, or otherwise transfer your personal information to third parties, 
                    except in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>With service providers who help us operate our business (delivery partners, payment processors)</li>
                    <li>When required by law or to protect our rights</li>
                    <li>With your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
                  <p className="text-muted-foreground">
                    We implement appropriate security measures to protect your personal information against 
                    unauthorized access, alteration, disclosure, or destruction. All payment information is 
                    processed through secure, PCI-compliant payment processors.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Mobile App Permissions</h2>
                  <p className="text-muted-foreground mb-4">
                    Our mobile app may request the following permissions:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Camera:</strong> To take photos of your laundry items for order documentation</li>
                    <li><strong>Location:</strong> To provide accurate pickup and delivery services</li>
                    <li><strong>Notifications:</strong> To send you order updates and delivery alerts</li>
                    <li><strong>Storage:</strong> To save order photos and app data locally</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    You can revoke these permissions at any time through your device settings.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Account Deletion and Data Retention</h2>
                  <p className="text-muted-foreground mb-4">
                    You have full control over your account and personal data. You can request account deletion 
                    at any time through your account settings.
                  </p>
                  
                  <h3 className="text-lg font-medium mb-2">Account Deletion Process:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Request Submission:</strong> You can initiate account deletion from your profile settings</li>
                    <li><strong>7-Day Waiting Period:</strong> Account deletion is scheduled for 7 days after your request to allow cancellation</li>
                    <li><strong>Data Export Option:</strong> You can request a copy of your personal data before deletion</li>
                    <li><strong>Confirmation Required:</strong> Multiple confirmation steps prevent accidental deletion</li>
                    <li><strong>Final Processing:</strong> After the waiting period, deletion is processed and cannot be reversed</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">What Gets Deleted:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Personal profile information (name, email, phone, address)</li>
                    <li>Account login credentials and authentication data</li>
                    <li>Communication preferences and notification settings</li>
                    <li>Stored payment methods and billing information</li>
                    <li>Profile photos and uploaded images</li>
                    <li>Chat messages and support conversations</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">What We Retain (Anonymized):</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Order history for business records and tax compliance (without personal identifiers)</li>
                    <li>Transaction records required by law (anonymized after deletion)</li>
                    <li>Aggregated usage statistics for service improvement (no personal data)</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">Active Orders:</h3>
                  <p className="text-muted-foreground">
                    Account deletion cannot be processed while you have active orders. All orders must be 
                    completed or cancelled before deletion can proceed.
                  </p>

                  <h3 className="text-lg font-medium mb-2 mt-4">Cancelling Deletion:</h3>
                  <p className="text-muted-foreground">
                    You can cancel your account deletion request at any time during the 7-day waiting period 
                    by logging into your account or contacting support.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                  <p className="text-muted-foreground mb-4">You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Access and update your personal information</li>
                    <li>Delete your account and associated data</li>
                    <li>Opt out of promotional communications</li>
                    <li>Request a copy of your data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about this Privacy Policy, please contact us at:
                  </p>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="font-medium">FreshDrop Support</p>
                    <p className="text-muted-foreground">Email: privacy@freshdrop.com</p>
                    <p className="text-muted-foreground">Phone: 1-800-FRESHDROP</p>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
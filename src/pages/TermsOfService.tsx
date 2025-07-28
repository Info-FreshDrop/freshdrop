import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
              <CardTitle className="text-3xl">Terms of Service</CardTitle>
              <CardDescription>
                Last updated: {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing and using the FreshDrop service, you accept and agree to be bound by the 
                    terms and provision of this agreement. If you do not agree to abide by the above, 
                    please do not use this service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
                  <p className="text-muted-foreground mb-4">
                    FreshDrop provides on-demand laundry and dry cleaning services through our mobile 
                    application and website. Our services include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Pickup and delivery of laundry items</li>
                    <li>Washing, drying, and folding services</li>
                    <li>Dry cleaning services</li>
                    <li>Special care for delicate items</li>
                    <li>Real-time order tracking</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">3. User Account</h2>
                  <p className="text-muted-foreground mb-4">
                    To use our services, you must create an account and provide accurate information. You are responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized use</li>
                    <li>Providing accurate and up-to-date information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Service Terms</h2>
                  
                  <h3 className="text-lg font-medium mb-2">Order Placement:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Orders must be placed through our official app or website</li>
                    <li>Minimum order requirements may apply</li>
                    <li>Service availability varies by location</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2">Pickup and Delivery:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Pickup and delivery times are estimates and may vary</li>
                    <li>Someone must be available during scheduled pickup/delivery windows</li>
                    <li>Items left in designated pickup locations are at customer's risk</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2">Item Care:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>We follow care instructions on garment labels</li>
                    <li>Special instructions must be noted when placing orders</li>
                    <li>Some items may require additional fees for special care</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Payment Terms</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Payment is due at the time of order placement</li>
                    <li>We accept major credit cards and digital payment methods</li>
                    <li>All payments are processed securely through Stripe</li>
                    <li>Prices are subject to change with notice</li>
                    <li>Additional fees may apply for special services or rush orders</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Cancellation and Refunds</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Orders can be cancelled before pickup without charge</li>
                    <li>Cancellations after pickup may incur fees</li>
                    <li>Refunds are processed to the original payment method</li>
                    <li>Partial refunds may apply for incomplete orders</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Liability and Insurance</h2>
                  <p className="text-muted-foreground mb-4">
                    While we take utmost care of your items, accidents can happen. Our liability is limited to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Maximum of 10x the cleaning cost for damaged items</li>
                    <li>No liability for items left in pockets</li>
                    <li>No liability for items not listed on the order</li>
                    <li>Claims must be reported within 48 hours of delivery</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">8. Prohibited Items</h2>
                  <p className="text-muted-foreground mb-4">
                    The following items are not accepted for cleaning:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Items contaminated with bodily fluids</li>
                    <li>Items with strong odors (smoke, pet odors, etc.)</li>
                    <li>Heavily soiled work clothes with grease, paint, or chemicals</li>
                    <li>Items requiring special permits (fur, leather requiring special treatment)</li>
                    <li>Extremely valuable items (jewelry, cash, electronics)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">9. Privacy</h2>
                  <p className="text-muted-foreground">
                    Your privacy is important to us. Please review our Privacy Policy, which also governs 
                    your use of the service, to understand our practices.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
                  <p className="text-muted-foreground">
                    We may terminate or suspend your account at any time for violation of these terms. 
                    You may also terminate your account at any time by contacting customer service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
                  <p className="text-muted-foreground">
                    For questions about these Terms of Service, please contact us:
                  </p>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="font-medium">FreshDrop Support</p>
                    <p className="text-muted-foreground">Email: support@freshdrop.com</p>
                    <p className="text-muted-foreground">Phone: 1-800-FRESHDROP</p>
                    <p className="text-muted-foreground">Address: 123 Laundry Lane, Clean City, CC 12345</p>
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileFeatures } from '@/components/mobile/MobileFeatures';
import { AppStoreAssets } from '@/components/mobile/AppStoreAssets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MobileTest() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <CardTitle className="text-3xl flex items-center gap-2">
                <Smartphone className="h-8 w-8" />
                Mobile App Testing & Assets
              </CardTitle>
              <CardDescription>
                Test mobile features and prepare App Store assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="features" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="features">Mobile Features</TabsTrigger>
                  <TabsTrigger value="assets">App Store Assets</TabsTrigger>
                </TabsList>
                
                <TabsContent value="features" className="mt-6">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-2">Test Mobile Features</h2>
                      <p className="text-muted-foreground mb-6">
                        Test native mobile capabilities like camera, location, and notifications
                      </p>
                    </div>
                    <MobileFeatures />
                  </div>
                </TabsContent>
                
                <TabsContent value="assets" className="mt-6">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-2">App Store Preparation</h2>
                      <p className="text-muted-foreground mb-6">
                        Checklist and tools for preparing your app for store submission
                      </p>
                    </div>
                    <AppStoreAssets />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
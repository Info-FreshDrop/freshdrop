import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Download, ExternalLink, Copy, Smartphone, Apple, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AppIcon {
  size: string;
  platform: string;
  required: boolean;
  generated?: boolean;
}

interface Screenshot {
  device: string;
  dimensions: string;
  platform: string;
  captured?: boolean;
}

interface StoreAsset {
  name: string;
  description: string;
  completed: boolean;
}

export const AppStoreAssets = () => {
  const [checkedIcons, setCheckedIcons] = useState<Record<string, boolean>>({});
  const [checkedScreenshots, setCheckedScreenshots] = useState<Record<string, boolean>>({});
  const [checkedAssets, setCheckedAssets] = useState<Record<string, boolean>>({});

  const appIcons: AppIcon[] = [
    { size: "1024x1024", platform: "App Store", required: true, generated: true },
    { size: "180x180", platform: "iOS", required: true },
    { size: "167x167", platform: "iPad Pro", required: true },
    { size: "152x152", platform: "iPad", required: true },
    { size: "120x120", platform: "iPhone", required: true },
    { size: "87x87", platform: "iPhone", required: true },
    { size: "80x80", platform: "iPhone", required: true },
    { size: "58x58", platform: "iPhone", required: true },
    { size: "40x40", platform: "iPhone", required: true },
    { size: "29x29", platform: "iPhone", required: true },
    { size: "20x20", platform: "iPhone", required: true },
    { size: "192x192", platform: "Android", required: true },
    { size: "144x144", platform: "Android", required: true },
    { size: "96x96", platform: "Android", required: true },
    { size: "72x72", platform: "Android", required: true },
    { size: "48x48", platform: "Android", required: true },
    { size: "36x36", platform: "Android", required: true },
  ];

  const screenshots: Screenshot[] = [
    { device: "iPhone 15 Pro Max", dimensions: "1290x2796", platform: "iOS" },
    { device: "iPhone 15 Pro", dimensions: "1179x2556", platform: "iOS" },
    { device: "iPhone 8 Plus", dimensions: "1242x2208", platform: "iOS" },
    { device: "iPad Pro (12.9-inch)", dimensions: "2048x2732", platform: "iOS" },
    { device: "Android Phone", dimensions: "1080x1920", platform: "Android" },
    { device: "Android Tablet", dimensions: "1200x1920", platform: "Android" },
  ];

  const storeAssets: StoreAsset[] = [
    { name: "App Description (iOS)", description: "Compelling 4000-character app description", completed: false },
    { name: "App Description (Android)", description: "Engaging 4000-character Google Play description", completed: false },
    { name: "Keywords (iOS)", description: "100-character keyword optimization", completed: false },
    { name: "Privacy Policy URL", description: "Required for both stores", completed: true },
    { name: "Support URL", description: "Customer support contact", completed: true },
    { name: "Feature Graphic (Android)", description: "1024x500 hero image for Play Store", completed: false },
    { name: "App Category", description: "Select appropriate category", completed: false },
    { name: "Age Rating", description: "Content rating for both stores", completed: false },
  ];

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const generateAppDescription = (platform: 'ios' | 'android') => {
    const description = platform === 'ios' 
      ? `FreshDrop - Premium Laundry & Dry Cleaning Delivery

Transform your laundry routine with FreshDrop, the ultimate on-demand laundry and dry cleaning service. Get professional-quality cleaning delivered right to your door with just a few taps.

🚀 FEATURES:
• Same-day pickup and delivery
• Professional washing, dry cleaning & pressing
• Real-time order tracking with live GPS
• Secure payment with Apple Pay & cards
• Custom laundry preferences
• 24/7 customer support
• Eco-friendly cleaning options

💼 PERFECT FOR:
• Busy professionals and families
• Students and young professionals
• Anyone who values time and convenience
• People seeking premium garment care

🔒 SECURE & RELIABLE:
• Background-checked operators
• Insured service guarantee
• Contactless pickup/delivery options
• SMS and push notifications

Download FreshDrop today and reclaim your time! Let us handle the laundry while you focus on what matters most.

Available in major metropolitan areas. Service coverage expanding rapidly.`
      : `FreshDrop - On-Demand Laundry & Dry Cleaning

Experience the future of laundry with FreshDrop! Professional cleaning services delivered to your doorstep with convenience, quality, and speed you can trust.

✨ Why Choose FreshDrop?
• Lightning-fast same-day service
• Professional-grade washing & dry cleaning
• Real-time GPS tracking of your orders
• Flexible scheduling that fits your life
• Eco-conscious cleaning practices
• Premium garment care specialists

🏠 How It Works:
1. Schedule pickup through the app
2. We collect your items at your convenience
3. Professional cleaning at our certified facilities
4. Fresh, clean clothes delivered back to you

💎 Premium Services:
• Dry cleaning for delicate fabrics
• Professional pressing & folding
• Stain removal specialists
• Custom care instructions
• Express turnaround options

🌟 Customer Benefits:
• Time-saving convenience
• Professional-quality results
• Affordable transparent pricing
• Satisfaction guarantee
• Growing service network

Join thousands of satisfied customers who've revolutionized their laundry routine with FreshDrop. Download now and get your first order processed with premium care!`;
    
    return description;
  };

  const generateKeywords = () => {
    return "laundry,dry cleaning,delivery,pickup,washing,pressing,garment care,convenience,professional";
  };

  const calculateProgress = () => {
    const totalItems = appIcons.length + screenshots.length + storeAssets.length;
    const completedItems = 
      Object.keys(checkedIcons).length + 
      Object.keys(checkedScreenshots).length + 
      Object.keys(checkedAssets).length +
      storeAssets.filter(asset => asset.completed).length;
    return Math.round((completedItems / totalItems) * 100);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold mb-2">📱 FreshDrop App Store Submission</h1>
        <p className="text-muted-foreground">Complete checklist for iOS App Store and Google Play Store submission</p>
        
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Submission Progress</span>
            <span>{calculateProgress()}% Complete</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4 flex-col"
              onClick={() => copyToClipboard(generateAppDescription('ios'), 'iOS App Description')}
            >
              <Apple className="h-6 w-6" />
              <span>Copy iOS Description</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4 flex-col"
              onClick={() => copyToClipboard(generateAppDescription('android'), 'Android App Description')}
            >
              <Play className="h-6 w-6" />
              <span>Copy Android Description</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4 flex-col"
              onClick={() => copyToClipboard(generateKeywords(), 'App Store Keywords')}
            >
              <Copy className="h-6 w-6" />
              <span>Copy Keywords</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Icons Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            App Icons Checklist
          </CardTitle>
          <CardDescription>
            Track your icon generation progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">🎯 Automatic Generation (Recommended)</h4>
            <code className="text-sm bg-background p-2 rounded block">
              npx @capacitor/assets generate --iconPath freshdrop-logo-1024.png --splashPath freshdrop-logo-1024.png
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              This command generates all required icons and splash screens automatically.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {appIcons.map((icon, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  checked={checkedIcons[`icon-${index}`] || false}
                  onCheckedChange={(checked) => 
                    setCheckedIcons(prev => ({ ...prev, [`icon-${index}`]: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{icon.size}</div>
                  <div className="text-xs text-muted-foreground">{icon.platform}</div>
                </div>
                <Badge variant={icon.generated ? "default" : "secondary"} className="text-xs">
                  {icon.generated ? "✓ Ready" : "Required"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            App Store Screenshots
          </CardTitle>
          <CardDescription>
            Capture required screenshots for store listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  checked={checkedScreenshots[`screenshot-${index}`] || false}
                  onCheckedChange={(checked) => 
                    setCheckedScreenshots(prev => ({ ...prev, [`screenshot-${index}`]: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{screenshot.device}</div>
                  <div className="text-xs text-muted-foreground">{screenshot.dimensions}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {screenshot.platform}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Store Assets Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Store Metadata & Assets
          </CardTitle>
          <CardDescription>
            Complete your store listing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {storeAssets.map((asset, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  checked={checkedAssets[`asset-${index}`] || asset.completed}
                  onCheckedChange={(checked) => 
                    setCheckedAssets(prev => ({ ...prev, [`asset-${index}`]: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{asset.name}</div>
                  <div className="text-xs text-muted-foreground">{asset.description}</div>
                </div>
                <Badge variant={asset.completed ? "default" : "secondary"} className="text-xs">
                  {asset.completed ? "✓ Ready" : "Todo"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final Steps */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle>🚀 Ready for Submission!</CardTitle>
          <CardDescription>
            Your FreshDrop app is configured and ready for App Store submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Apple className="h-4 w-4" />
                iOS App Store
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Apple Developer Account required ($99/year)</li>
                <li>✓ Xcode for building and submission</li>
                <li>✓ TestFlight for beta testing</li>
                <li>✓ App Store Connect for metadata</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Play className="h-4 w-4" />
                Google Play Store
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Google Play Console account ($25 one-time)</li>
                <li>✓ Android Studio for building</li>
                <li>✓ Internal testing track available</li>
                <li>✓ Play Console for store listing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
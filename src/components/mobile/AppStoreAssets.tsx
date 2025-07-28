import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Image, Smartphone, Monitor } from 'lucide-react';

interface AppIcon {
  size: string;
  platform: 'iOS' | 'Android' | 'Both';
  required: boolean;
}

interface Screenshot {
  device: string;
  dimensions: string;
  platform: 'iOS' | 'Android';
}

export function AppStoreAssets() {
  const appIcons: AppIcon[] = [
    { size: '1024x1024', platform: 'iOS', required: true },
    { size: '180x180', platform: 'iOS', required: true },
    { size: '120x120', platform: 'iOS', required: true },
    { size: '87x87', platform: 'iOS', required: true },
    { size: '80x80', platform: 'iOS', required: true },
    { size: '58x58', platform: 'iOS', required: true },
    { size: '512x512', platform: 'Android', required: true },
    { size: '192x192', platform: 'Android', required: true },
    { size: '144x144', platform: 'Android', required: true },
    { size: '96x96', platform: 'Android', required: true },
    { size: '72x72', platform: 'Android', required: true },
    { size: '48x48', platform: 'Android', required: true }
  ];

  const screenshots: Screenshot[] = [
    { device: 'iPhone 15 Pro Max', dimensions: '1290x2796', platform: 'iOS' },
    { device: 'iPhone 15', dimensions: '1179x2556', platform: 'iOS' },
    { device: 'iPad Pro 12.9"', dimensions: '2048x2732', platform: 'iOS' },
    { device: 'Pixel 7 Pro', dimensions: '1440x3120', platform: 'Android' },
    { device: 'Samsung Galaxy S23', dimensions: '1080x2340', platform: 'Android' },
    { device: 'Tablet 10"', dimensions: '1920x1200', platform: 'Android' }
  ];

  const generateIconScript = () => {
    return `#!/bin/bash
# App Icon Generator Script
# This script helps generate all required app icon sizes from a source image

SOURCE_IMAGE="freshdrop-logo-1024.png"

# iOS Icons
sips -z 180 180 $SOURCE_IMAGE --out ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png
sips -z 120 120 $SOURCE_IMAGE --out ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png
sips -z 87 87 $SOURCE_IMAGE --out ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png
sips -z 80 80 $SOURCE_IMAGE --out ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png
sips -z 58 58 $SOURCE_IMAGE --out ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png

# Android Icons
sips -z 512 512 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
sips -z 192 192 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
sips -z 144 144 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
sips -z 96 96 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-hdpi/ic_launcher.png
sips -z 72 72 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-mdpi/ic_launcher.png
sips -z 48 48 $SOURCE_IMAGE --out android/app/src/main/res/mipmap-ldpi/ic_launcher.png

echo "App icons generated successfully!"`;
  };

  const downloadScript = () => {
    const element = document.createElement('a');
    const file = new Blob([generateIconScript()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'generate-icons.sh';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            App Store Assets Checklist
          </CardTitle>
          <CardDescription>
            Required visual assets for iOS App Store and Google Play Store submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* App Icons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">App Icons</h3>
              <Button onClick={downloadScript} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Generator Script
              </Button>
            </div>
            
            <div className="grid gap-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">iOS Icons</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {appIcons.filter(icon => icon.platform === 'iOS').map((icon, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{icon.size}</span>
                      <Badge variant={icon.required ? "default" : "secondary"} className="text-xs">
                        {icon.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Android Icons</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {appIcons.filter(icon => icon.platform === 'Android').map((icon, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{icon.size}</span>
                      <Badge variant={icon.required ? "default" : "secondary"} className="text-xs">
                        {icon.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              App Store Screenshots
            </h3>
            
            <div className="grid gap-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">iOS Screenshots</h4>
                <div className="space-y-2">
                  {screenshots.filter(shot => shot.platform === 'iOS').map((shot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{shot.device}</span>
                        <p className="text-sm text-muted-foreground">{shot.dimensions} pixels</p>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Android Screenshots</h4>
                <div className="space-y-2">
                  {screenshots.filter(shot => shot.platform === 'Android').map((shot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{shot.device}</span>
                        <p className="text-sm text-muted-foreground">{shot.dimensions} pixels</p>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Assets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Additional Marketing Assets
            </h3>
            
            <div className="grid gap-3">
              <div className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Feature Graphic (Google Play)</span>
                    <p className="text-sm text-muted-foreground">1024x500 pixels</p>
                  </div>
                  <Badge variant="outline">Required</Badge>
                </div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Promotional Video (Optional)</span>
                    <p className="text-sm text-muted-foreground">30-120 seconds</p>
                  </div>
                  <Badge variant="secondary">Optional</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Asset Generation Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Start with a high-resolution app icon (at least 1024x1024)</li>
              <li>Use the provided script to generate all required icon sizes</li>
              <li>Take screenshots of your app on various device sizes</li>
              <li>Create compelling app store descriptions and metadata</li>
              <li>Ensure all assets meet platform guidelines for quality and content</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
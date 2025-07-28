# FreshDrop Mobile App Deployment Guide

## Overview
This guide walks you through converting your FreshDrop web app into native iOS and Android applications ready for App Store submission.

## Prerequisites
1. **Development Environment**:
   - Mac computer (required for iOS development)
   - Xcode 15+ installed
   - Android Studio installed
   - Node.js 18+ installed

2. **Developer Accounts**:
   - Apple Developer Account ($99/year)
   - Google Play Console Account ($25 one-time)

## Step 1: Export and Setup

1. **Export your project to GitHub**:
   - Click the GitHub button in Lovable
   - Clone your repository locally

2. **Install dependencies**:
   ```bash
   cd your-project-directory
   npm install
   ```

3. **Build the web app**:
   ```bash
   npm run build
   ```

## Step 2: Initialize Capacitor

1. **Initialize Capacitor** (already configured in your project):
   ```bash
   npx cap init
   ```

2. **Add platforms**:
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. **Sync the project**:
   ```bash
   npx cap sync
   ```

## Step 3: Configure App Icons and Splash Screens

1. **Prepare your app icon**:
   - Create a 1024x1024 PNG version of your FreshDrop logo
   - Place it in the project root as `freshdrop-logo-1024.png`

2. **Generate app icons**:
   - Navigate to `/mobile-test` in your app
   - Download the icon generator script
   - Run the script to generate all required icon sizes

3. **Configure splash screens**:
   ```bash
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate
   ```

## Step 4: iOS App Store Preparation

### 4.1 Xcode Configuration
1. **Open iOS project**:
   ```bash
   npx cap open ios
   ```

2. **Configure in Xcode**:
   - Set Bundle Identifier: `app.lovable.freshdrop`
   - Set Display Name: `FreshDrop`
   - Configure signing certificates
   - Set deployment target to iOS 13.0+

### 4.2 App Store Assets
1. **Screenshots**: Take screenshots on:
   - iPhone 15 Pro Max (1290x2796)
   - iPhone 15 (1179x2556)
   - iPad Pro 12.9" (2048x2732)

2. **App Store listing**:
   - App Name: "FreshDrop - Laundry & Dry Cleaning"
   - Subtitle: "On-demand pickup & delivery"
   - Keywords: "laundry, dry cleaning, pickup, delivery, washing"
   - Description: Focus on convenience, quality, and reliability

### 4.3 Privacy and Compliance
1. **App Tracking Transparency**: Configure if using analytics
2. **Privacy Policy**: Link to your privacy policy page
3. **Data usage**: Declare what data you collect

## Step 5: Android Play Store Preparation

### 5.1 Android Studio Configuration
1. **Open Android project**:
   ```bash
   npx cap open android
   ```

2. **Configure in Android Studio**:
   - Set Application ID: `app.lovable.freshdrop`
   - Set version code and version name
   - Configure signing key for release builds

### 5.2 Play Store Assets
1. **Screenshots**: Take screenshots on:
   - Pixel 7 Pro (1440x3120)
   - Samsung Galaxy S23 (1080x2340)
   - 10" Tablet (1920x1200)

2. **Feature Graphic**: Create 1024x500 promotional image

3. **App listing**:
   - Title: "FreshDrop: Laundry Delivery"
   - Short Description: "Professional laundry pickup & delivery service"
   - Full Description: Highlight features, benefits, and service areas

## Step 6: Testing

### 6.1 Device Testing
1. **iOS TestFlight**:
   ```bash
   # Build and archive for TestFlight
   npx cap build ios
   ```

2. **Android Internal Testing**:
   ```bash
   # Build release APK/AAB
   npx cap build android --prod
   ```

### 6.2 Feature Testing
- Test all mobile features using the Mobile Test page
- Verify camera, location, and notification permissions
- Test offline functionality
- Verify payment processing works

## Step 7: Submission

### 7.1 iOS App Store
1. **Prepare build**:
   - Archive build in Xcode
   - Upload to App Store Connect
   - Fill out app information and metadata

2. **Submit for review**:
   - Select build for release
   - Submit for App Store review
   - Wait for approval (typically 24-48 hours)

### 7.2 Google Play Store
1. **Prepare release**:
   - Generate signed APK/AAB
   - Upload to Play Console
   - Complete store listing

2. **Release**:
   - Choose release track (internal/closed/open testing or production)
   - Submit for review
   - Publish when approved

## Step 8: Post-Launch

### 8.1 Monitoring
- Monitor crash reports and user feedback
- Track app store reviews and ratings
- Monitor app performance and loading times

### 8.2 Updates
- Plan regular updates with new features
- Fix bugs promptly based on user feedback
- Keep dependencies and security patches up to date

### 8.3 Marketing
- Encourage users to leave reviews
- Implement App Store Optimization (ASO)
- Consider promotional campaigns

## Troubleshooting

### Common Issues:
1. **Build failures**: Check Capacitor and platform versions
2. **Permission issues**: Verify Info.plist and AndroidManifest.xml
3. **Icon/splash problems**: Use capacitor-assets to regenerate
4. **Signing issues**: Verify certificates and provisioning profiles

### Useful Commands:
```bash
# Clean and rebuild
npx cap clean
npm run build
npx cap sync

# Update Capacitor
npm update @capacitor/core @capacitor/cli
npx cap sync

# Check Capacitor doctor
npx cap doctor
```

## Support Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

**Next Steps**: Start with Step 1 and work through each section methodically. The Mobile Test page in your app will help you verify that all native features are working correctly before submission.
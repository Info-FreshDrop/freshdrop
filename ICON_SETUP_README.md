# FreshDrop App Icon Setup

## Quick Setup for App Store Submission

Your high-resolution app icon has been created: `freshdrop-logo-1024.png`

### Automatic Icon Generation (Recommended)

Run this command to generate all required app icons:

```bash
npx @capacitor/assets generate --iconPath freshdrop-logo-1024.png --splashPath freshdrop-logo-1024.png
```

This will automatically create:
- iOS icons (all required sizes from 20x20 to 1024x1024)
- Android icons (all density versions from ldpi to xxxhdpi)
- Splash screens for all platforms and orientations

### Manual Generation (Alternative)

If you prefer manual control, visit `/mobile-test` in your app to:
1. Download the icon generation script
2. Run it locally to create all required sizes

### Next Steps for App Store Submission

1. **Generate Icons**: Run the command above
2. **Sync Capacitor**: `npx cap sync`
3. **Build Platforms**: 
   - iOS: `npx cap add ios` then `npx cap open ios`
   - Android: `npx cap add android` then `npx cap open android`
4. **Test on Device**: Use Xcode/Android Studio to deploy to physical devices
5. **Prepare for Submission**: Follow store-specific guidelines

### Icon Requirements Met ✅

- **1024x1024 Source**: ✅ Created
- **iOS Compliance**: ✅ No transparency, proper margins
- **Android Compliance**: ✅ Adaptive icon ready
- **Branding Consistency**: ✅ Matches FreshDrop theme

### Store Submission Checklist

- [ ] Icons generated and tested
- [ ] Screenshots captured (see AppStoreAssets component at `/mobile-test`)
- [ ] App metadata prepared
- [ ] Privacy policy and terms ready
- [ ] Developer accounts active (Apple Developer, Google Play Console)

Your app icon is now ready for App Store and Google Play Store submission!
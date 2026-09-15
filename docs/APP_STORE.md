# Shipping Notary Book to the App Store

The iOS app is the website bundled in a Capacitor shell (`ios/App`). GitHub
Pages keeps serving the web version; the app ships its own copy from `dist/`.

## Every release

```bash
npm run ios:sync        # builds dist/ and copies it into the iOS project
```

Then in Xcode (`npx cap open ios`): bump **Version** / **Build** on the App
target, set the destination to **Any iOS Device (arm64)**, and choose
**Product → Archive**. In the Organizer, **Distribute App → App Store
Connect → Upload**. Signing is automatic with team `L7H9872BR2`.

Command line alternative once an Apple Account exists in Xcode:

```bash
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/NotaryBook.xcarchive \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/NotaryBook.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/export -allowProvisioningUpdates
```

`ExportOptions.plist` uploads straight to App Store Connect.

## One-time setup

1. **Apple Account in Xcode**: Xcode → Settings → Apple Accounts → Add.
   Without it, archiving fails with "No Accounts".
2. **App record** in App Store Connect: My Apps → **+** → New App. Platform
   iOS, name **Notary Book**, bundle ID `com.thenotarybook.app` (Xcode's
   automatic signing registers it on first archive), SKU `notarybook-ios`.
3. **Listing**: paste from `store/listing.md`; upload `store/*.png` as the
   6.9" iPhone screenshots.
4. **App Privacy** questionnaire: answers in `store/listing.md`.
5. **Review Information**: provide a demo account (create one in the app)
   so the reviewer can sign in.
6. Submit for review.

## What the app does differently from the web

- Firebase Auth initializes with IndexedDB persistence (`js/firebase.js`)
  because the default auth iframe cannot run on the `capacitor://` origin.
- Google sign-in is hidden; email/password is the native sign-in method.
- The Firebase SDK and the Cormorant font are vendored (`js/vendor`, `fonts`)
  so nothing cross-origin has to load at boot.
- Sharing an intake link uses the native share sheet.
- Account deletion (Profile tab) satisfies App Store guideline 5.1.1(v).

## Regenerating icons and splash

`assets/icon-only.png` (1024) and `assets/splash.png` (2732) are the sources;
`npm run assets` regenerates everything in `ios/App/App/Assets.xcassets`.

/**
 * Capacitor configuration for the Reely iOS app.
 * ---------------------------------------------------------------------------
 *
 * WHY server.url (live site) INSTEAD OF BUNDLED STATIC FILES
 * ---------------------------------------------------------
 * Reely is a *server-rendered* Next.js 15 app: it has API routes, Prisma, and
 * dynamic (per-request) pages. It CANNOT be `next export`-ed to static files,
 * so there is no folder of HTML/JS to bundle into the native app.
 *
 * Instead, this Capacitor wrapper is a thin native container (WKWebView) that
 * loads the LIVE, hosted Reely site over HTTPS via `server.url` below. The app
 * is a real native app hitting your production API — not just "Safari in a
 * box." This is the standard, App-Store-acceptable pattern for server-driven
 * Next.js apps wrapped with Capacitor.
 *
 * Consequences of using `server.url`:
 *   - `webDir` ("public") is effectively IGNORED at runtime. Capacitor still
 *     requires the field, so it points at the repo's existing `public/` folder
 *     purely as a valid placeholder. Nothing from it is served when a remote
 *     `server.url` is set.
 *   - You MUST set the URL to your deployed HTTPS domain before shipping.
 *     Set the REELY_APP_URL env var when running `npx cap sync ios`, e.g.
 *         REELY_APP_URL="https://app.reely.com" npx cap sync ios
 *     The default below (https://app.reely.example) is a non-working
 *     placeholder that will produce a white screen — see ios-wrapper/README.md.
 *   - `cleartext` stays false: HTTPS only. No plain-HTTP loads.
 *
 * HOW TO CHANGE THE APP ID (bundle identifier)
 * --------------------------------------------
 * `appId` below ("app.reely.ios") is the CFBundleIdentifier used when you run
 * `npx cap add ios`. It must match the App ID / bundle identifier you register
 * in your Apple Developer account and in Xcode's "Signing & Capabilities" tab.
 * To use your own reverse-DNS identifier, change `appId` here BEFORE running
 * `npx cap add ios` (changing it afterward means updating it in Xcode too).
 * Example: "com.yourcompany.reely".
 *
 * ---------------------------------------------------------------------------
 */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Change this to your own reverse-DNS bundle identifier before `cap add ios`.
  appId: "app.reely.ios",
  appName: "Reely",

  // Placeholder only — unused at runtime because `server.url` is set below.
  // Points at the existing Next.js public/ folder so the field is valid.
  webDir: "public",

  server: {
    // The LIVE hosted Reely site. Override per-build with REELY_APP_URL, e.g.
    //   REELY_APP_URL="https://app.reely.com" npx cap sync ios
    // The .example default is intentionally non-functional — replace it.
    url: process.env.REELY_APP_URL || "https://app.reely.example",

    // HTTPS only. Never enable cleartext for a shipping build.
    cleartext: false,

    // Domains the WKWebView may navigate to *in-app*. Leave empty to keep the
    // app scoped to your own origin; links to other origins open in Safari.
    // Add your production domain here, e.g. ["app.reely.com"], if you need
    // in-app navigation to a second host (auth callback, CDN, etc.).
    allowNavigation: [],
  },

  ios: {
    // Respect the safe area (notch / home indicator) automatically.
    contentInset: "always",
    // Matches the app's dark chrome so there's no white flash on load.
    backgroundColor: "#0c0e1c",
  },

  plugins: {
    StatusBar: {
      // Dark UI → light status-bar content. "dark" = dark status bar style.
      style: "dark",
    },
    SplashScreen: {
      backgroundColor: "#12142a",
      launchShowDuration: 800,
    },
  },
};

export default config;

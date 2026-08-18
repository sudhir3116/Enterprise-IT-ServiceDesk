/**
 * Passport.js OAuth Strategy Configuration
 *
 * Strategies are registered CONDITIONALLY — only when the required credentials
 * are present in the environment. This ensures the server boots cleanly during
 * local development even without OAuth keys configured, following the principle
 * of graceful degradation for optional integrations.
 */

const passport = require("passport");
const User = require("../models/User");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Determine if a value is a real credential (not a placeholder/empty)
// ─────────────────────────────────────────────────────────────────────────────
const isConfigured = (value) =>
  !!value && !value.startsWith("your_") && value.trim() !== "";

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE STRATEGY (only registered if credentials are present)
// ─────────────────────────────────────────────────────────────────────────────
if (isConfigured(process.env.GOOGLE_CLIENT_ID) && isConfigured(process.env.GOOGLE_CLIENT_SECRET)) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8001/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || profile.name?.givenName || "Google User";

          // 1. Check if a user already has this googleId linked
          let user = await User.findOne({ googleId: profile.id });

          if (!user && email) {
            // 2. Link existing local account if email matches
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              user.authProvider = "google";
              user.isEmailVerified = true;
              await user.save();
            }
          }

          if (!user) {
            // 3. Auto-provision a new account for this Google identity
            user = await User.create({
              name,
              email,
              googleId: profile.id,
              authProvider: "google",
              role: "requester",
              isEmailVerified: true, // Google is the identity authority
              department: "General",
              designation: "Staff",
              employeeId: "EMP-" + Math.floor(100000 + Math.random() * 90000),
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  console.log("✅ Google OAuth strategy registered");
} else {
  console.warn("⚠️  Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable");
}

// ─────────────────────────────────────────────────────────────────────────────
// MICROSOFT ENTRA ID (AZURE AD) STRATEGY (only registered if credentials are present)
// ─────────────────────────────────────────────────────────────────────────────
if (isConfigured(process.env.MICROSOFT_CLIENT_ID) && isConfigured(process.env.MICROSOFT_CLIENT_SECRET)) {
  const MicrosoftStrategy = require("passport-microsoft").Strategy;

  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || "http://localhost:8001/api/auth/microsoft/callback",
        scope: ["user.read"],
        tenant: process.env.MICROSOFT_TENANT_ID || "common",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ||
            profile._json?.mail ||
            profile._json?.userPrincipalName;
          const name = profile.displayName || "Microsoft User";

          // 1. Check if a user already has this microsoftId linked
          let user = await User.findOne({ microsoftId: profile.id });

          if (!user && email) {
            // 2. Link existing local account if email matches
            user = await User.findOne({ email });
            if (user) {
              user.microsoftId = profile.id;
              user.authProvider = "microsoft";
              user.isEmailVerified = true;
              await user.save();
            }
          }

          if (!user) {
            // 3. Auto-provision new account
            user = await User.create({
              name,
              email,
              microsoftId: profile.id,
              authProvider: "microsoft",
              role: "requester",
              isEmailVerified: true,
              department: "General",
              designation: "Staff",
              employeeId: "EMP-" + Math.floor(100000 + Math.random() * 90000),
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  console.log("✅ Microsoft OAuth strategy registered");
} else {
  console.warn("⚠️  Microsoft OAuth not configured — set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env to enable");
}

module.exports = passport;


/**
 * OAuth Routes — Google & Microsoft SSO
 *
 * Design Decision:
 * - These routes are session-less (no express-session required).
 * - After the OAuth callback, a short-lived Access Token and long-lived
 *   HttpOnly Refresh Token are issued — matching the local login dual-token pattern.
 * - Routes guard themselves: if a strategy is not configured (no credentials),
 *   they return 503 with a clear message instead of crashing.
 */

const express = require("express");
const router = express.Router();
const passport = require("passport");
const authService = require("../services/authService");
const { logAudit } = require("../utils/auditLogger");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Check if a passport strategy is registered
// ─────────────────────────────────────────────────────────────────────────────
const isStrategyRegistered = (name) => !!passport._strategies[name];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Handle successful OAuth completion
// ─────────────────────────────────────────────────────────────────────────────
const handleOAuthSuccess = async (req, res, user) => {
  try {
    const timeout = await authService.getSessionTimeout();
    const accessToken = authService.generateAccessToken(user._id, timeout);
    const refreshToken = authService.generateRefreshToken(user._id, 7);

    const deviceInfo = authService.getDeviceInfo(req.headers["user-agent"]);
    user.refreshTokens.push({ token: refreshToken, deviceInfo });
    user.lastLogin = new Date();
    await user.save();

    await logAudit({
      entity: "User", entityId: user._id,
      action: `SSO Login (${user.authProvider})`,
      performedBy: user._id,
      after: { email: user.email, authProvider: user.authProvider },
    }).catch(() => {});

    // Set HttpOnly refresh token cookie (sameSite: lax for OAuth redirect flow)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token in query param
    // The client reads this once, stores in memory, then clears from URL
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/oauth-callback?token=${accessToken}`);
  } catch (err) {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/login?error=sso_failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/auth/google
 * @desc    Redirect user to Google OAuth consent screen
 * @access  Public
 */
router.get("/google", (req, res, next) => {
  if (!isStrategyRegistered("google")) {
    return res.status(503).json({
      message: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.",
    });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google redirects here after user consents
 * @access  Public
 */
router.get("/google/callback", (req, res, next) => {
  if (!isStrategyRegistered("google")) {
    return res.status(503).json({ message: "Google OAuth is not configured." });
  }
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google_auth_failed`,
    session: false,
  })(req, res, async () => {
    await handleOAuthSuccess(req, res, req.user);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MICROSOFT ENTRA ID (AZURE AD) OAUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/auth/microsoft
 * @desc    Redirect user to Microsoft OAuth consent screen
 * @access  Public
 */
router.get("/microsoft", (req, res, next) => {
  if (!isStrategyRegistered("microsoft")) {
    return res.status(503).json({
      message: "Microsoft OAuth is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to .env.",
    });
  }
  passport.authenticate("microsoft", { session: false })(req, res, next);
});

/**
 * @route   GET /api/auth/microsoft/callback
 * @desc    Microsoft redirects here after user consents
 * @access  Public
 */
router.get("/microsoft/callback", (req, res, next) => {
  if (!isStrategyRegistered("microsoft")) {
    return res.status(503).json({ message: "Microsoft OAuth is not configured." });
  }
  passport.authenticate("microsoft", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=microsoft_auth_failed`,
    session: false,
  })(req, res, async () => {
    await handleOAuthSuccess(req, res, req.user);
  });
});

module.exports = router;
